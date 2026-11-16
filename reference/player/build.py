d=open('deck.json').read().replace('</','<\\/')
h=open('page.html').read().replace('__DECK__',d).replace('/*KATEXCSS*/',open('katex_inline.css').read())
open('index.html','w').write(h)
print(len(h))
