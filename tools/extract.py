#!/usr/bin/env python3
"""backup/original のHTMLから本文を抽出し、Astroのページと共通データを生成する。

使い方: python3 -I tools/extract.py   (リポジトリのルートで実行)
生成物: src/pages/*.astro, src/data/{nav,pages}.json, public/images/**
ログ:   tools/extract-report.json
"""
import glob, json, os, re, shutil, sys
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup, Comment

ROOT = os.getcwd()
SRC = 'backup/original/pages'
ASSETS = 'backup/original/assets'
BASE = 'https://www.lotas-asahi.com/'
SKIP_PAGES = {'thankyou', 'thankyou_c', 'thankyou_ec', 'thankyou_es', 'thankyou_s'}  # Googleフォーム採用により不要
REPORT = {'dropped_pages': sorted(SKIP_PAGES), 'missing_images': [], 'link_rewrites': [], 'forms': [], 'empty_pages': []}

def load(f):
    return BeautifulSoup(open(f, encoding='utf-8').read(), 'lxml')

def slug_of(path):
    n = os.path.basename(path)[:-5]
    return 'index' if n == '_root' else n

# ---------- nav ----------
def build_nav():
    s = load(f'{SRC}/_root.html')
    menu = s.find(id='menu_left_right')
    cats = []
    for li in menu.find('ul', recursive=False).find_all('li', recursive=False):
        a = li.find('a', recursive=False)
        if not a or not a.get('href'): continue
        href = a['href'].replace('./', '').strip('/') or 'index.html'
        if href == 'estimate.html':  # 元サイトで404のページ(メニューだけに残っている)
            REPORT['link_rewrites'].append(['menu:estimate.html', 'removed']); continue
        cat = {'title': a.get_text(strip=True), 'href': href, 'children': []}
        sub = li.find('ul', recursive=False)
        if sub:
            for sli in sub.find_all('li'):
                sa = sli.find('a')
                if sa and sa.get('href'):
                    h = sa['href'].replace('./', '')
                    if h == href: continue
                    cat['children'].append({'title': sa.get_text(strip=True), 'href': h})
        cats.append(cat)
    return cats

# ---------- cleaning ----------
KEEP_ATTR = {'href', 'src', 'alt', 'colspan', 'rowspan', 'target', 'rel', 'width', 'height', 'title'}
DROP_CLASS = re.compile(r'^(js-|inplace|edit|sameheight|parallax|hasLink$|clear$)|^(imageBox|otherPict|otherFast|checkedValid)')

def img_path(src):
    """画像URLを /images/... に変換し、公開用ディレクトリへコピーする。"""
    u = urljoin(BASE, src.strip())
    p = urlparse(u)
    if p.netloc == 'dekiteru.media':
        rel = p.path.replace('/open/10524/img/', '', 1).lstrip('/')
        local = f'{ASSETS}/dekiteru.media{p.path}'
    elif p.netloc.endswith('lotas-asahi.com'):
        rel = p.path.lstrip('/').replace('img/', '', 1)
        local = f'{ASSETS}/www.lotas-asahi.com{p.path}'
    else:
        return src
    if not os.path.isfile(local):
        REPORT['missing_images'].append(src); return src
    dst = f'public/images/{rel}'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst): shutil.copy(local, dst)
    return '/images/' + rel

def fix_href(h):
    if not h or h.startswith(('#', 'mailto:', 'tel:', 'javascript:')): return h
    u = urljoin(BASE, h)
    p = urlparse(u)
    if p.netloc.endswith('lotas-asahi.com') or p.netloc == '':
        path = p.path or '/'
        name = path.lstrip('/')
        if name == 'estimate.html':   # 元サイトに存在しない(404)ページへのリンク
            REPORT['link_rewrites'].append([h, '/contact.html']); return '/contact.html'
        if name.endswith('.html') and name[:-5] in SKIP_PAGES:
            REPORT['link_rewrites'].append([h, '/contact.html']); return '/contact.html'
        out = '/' + name + (('#' + p.fragment) if p.fragment else '')
        if out != h: REPORT['link_rewrites'].append([h, out])
        return out
    return h

def style_to_semantics(tag):
    st = (tag.get('style') or '').replace(' ', '').lower()
    cls = []
    if re.search(r'color:(rgb\(255,0,0\)|#f00|#ff0000|red)', st): cls.append('t-red')
    if re.search(r'background-color:(yellow|#ff0|#ffff00|rgb\(255,255,0\))', st): cls.append('t-mark')
    if 'font-weight:bold' in st: cls.append('t-bold')
    return cls

def clean_block(blk, slug):
    for x in blk.find_all(['script', 'style', 'noscript']): x.decompose()
    for x in blk.find_all(string=lambda t: isinstance(t, Comment)): x.extract()
    for x in blk.find_all('input'): x.decompose()
    # iframe: Googleマップ(APIキー付き)をキー不要の埋め込みに差し替え
    for f in blk.find_all('iframe'):
        if 'google.com/maps' in (f.get('src') or ''):
            f['src'] = 'https://maps.google.com/maps?q=34.7247028,135.1346414&z=16&output=embed'
            f['loading'] = 'lazy'; f['title'] = '地図: 有限会社 朝日自動車サービス'
            for a in ('width', 'height', 'frameborder', 'style', 'referrerpolicy'): f.attrs.pop(a, None)
    for t in blk.find_all(True):
        sem = style_to_semantics(t)
        keep = {k: v for k, v in t.attrs.items() if k in KEEP_ATTR or k in ('loading',)}
        if t.name == 'iframe':
            keep = {k: v for k, v in t.attrs.items() if k in ('src', 'loading', 'title')}
        classes = [c for c in (t.get('class') or []) if not DROP_CLASS.search(c)]
        classes += sem
        if classes: keep['class'] = ' '.join(dict.fromkeys(classes))
        if t.get('id', '').startswith('block_outer_'):
            keep['data-block'] = re.sub(r'\d+$', '', t['id'][len('block_outer_'):]).strip('_')
        t.attrs = keep
        if t.name == 'img' and t.get('src'): t['src'] = img_path(t['src'])
        if t.name == 'a' and t.get('href'): t['href'] = fix_href(t['href'])
        if t.name == 'img': t.attrs.setdefault('alt', ''); t['loading'] = 'lazy'
    # 意味のない入れ子を解消(class・data-block のない div/span)
    for t in list(blk.find_all(['div', 'span', 'center', 'font'])):
        if not t.attrs: t.unwrap()
    # 空要素の除去(繰り返し)
    changed = True
    while changed:
        changed = False
        for t in list(blk.find_all(['div', 'span', 'p', 'b', 'strong', 'li', 'ul', 'a'])):
            if t.parent is None: continue
            if not t.get_text(strip=True) and not t.find(['img', 'iframe', 'table']) and t.name != 'a' or (t.name == 'a' and not t.get_text(strip=True) and not t.find('img')):
                t.decompose(); changed = True
    for t in blk.find_all('b'):
        if not t.get_text(strip=True).replace('\xa0', ''): t.decompose()
    return blk

def render_block(blk):
    html = blk.decode(formatter='html5') if hasattr(blk, 'decode') else str(blk)
    html = html.replace('{', '&#123;').replace('}', '&#125;')
    html = re.sub(r'\n\s*\n+', '\n', html)
    return html

def extract_page(f, nav_titles):
    slug = slug_of(f)
    s = load(f)
    title = s.title.get_text(strip=True) if s.title else slug
    d = s.find('meta', attrs={'name': 'description'}); desc = d['content'] if d else ''
    k = s.find('meta', attrs={'name': 'keywords'}); kw = k['content'] if k else ''
    crumbs = [li.get_text(strip=True) for li in s.select('#pan li')]
    main = s.find(id='main_contents')
    has_lead = False; blocks = []; notes = []
    for b in main.find_all('div', id=re.compile(r'^block_outer_')):
        bid = b['id']
        if b.find_parent('div', id=re.compile(r'^block_outer_')): continue
        if re.match(r'block_outer_(pankuzu|pagetitle)', bid): continue
        if bid.startswith('block_outer_lead'): has_lead = True; continue
        if bid.startswith(('block_outer_thankyou', 'block_outer_contact_enquete')): continue
        if b.find('form'):
            REPORT['forms'].append(slug)
            kind = 'contact'
            blocks.append(('FORM', b)); continue
        for lw in b.find_all('div', class_='lead__wrap'): lw.decompose()
        blocks.append(('HTML', b))
    # lead__wrap (同カテゴリの他ページ一覧)は自動生成するため本文から除く
    body = []
    for kind, b in blocks:
        if kind == 'FORM':
            body.append('<ContactForm />')
            continue
        for lw in b.find_all('div', class_='lead__wrap'): lw.decompose()
        cb = clean_block(b, slug)
        if cb.get_text(strip=True) or cb.find(['img', 'iframe', 'table']):
            body.append(render_block(cb))
    return {'slug': slug, 'title': title, 'description': desc, 'keywords': kw, 'crumbs': crumbs,
            'has_lead': has_lead, 'body': body}

def esc_attr(v):
    return json.dumps(v, ensure_ascii=False)

def write_page(p):
    slug = p['slug']
    imports = "import Layout from '../layouts/Layout.astro';\n"
    if any('<ContactForm' in b for b in p['body']): imports += "import ContactForm from '../components/ContactForm.astro';\n"
    body = '\n'.join(p['body'])
    if not body.strip(): REPORT['empty_pages'].append(slug)
    out = f"""---
{imports}---
<Layout
  title={esc_attr(p['title'])}
  description={esc_attr(p['description'])}
  keywords={esc_attr(p['keywords'])}
  slug={esc_attr(slug)}
  crumbs={{{json.dumps(p['crumbs'][1:], ensure_ascii=False)}}}
  lead={{{'true' if p['has_lead'] else 'false'}}}
>
{body}
</Layout>
"""
    os.makedirs('src/pages', exist_ok=True)
    open(f'src/pages/{slug}.astro', 'w', encoding='utf-8').write(out)

def main():
    nav = build_nav()
    os.makedirs('src/data', exist_ok=True)
    json.dump(nav, open('src/data/nav.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    pages = []
    for f in sorted(glob.glob(f'{SRC}/*.html')):
        slug = slug_of(f)
        if slug in SKIP_PAGES or slug == '404': continue
        p = extract_page(f, None)
        write_page(p)
        pages.append({k: p[k] for k in ('slug', 'title', 'crumbs')})
    # 404
    json.dump(pages, open('src/data/pages.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    json.dump(REPORT, open('tools/extract-report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('pages', len(pages), 'forms', REPORT['forms'], 'empty', REPORT['empty_pages'], 'missing images', len(REPORT['missing_images']))

main()
