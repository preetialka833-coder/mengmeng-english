"""Separate-language geometry / enumeration check; consumes declarative conditions, not JS answers."""
from pathlib import Path
from fractions import Fraction
import json,xml.etree.ElementTree as ET
d=json.loads((Path(__file__).resolve().parents[1]/'data/math-original-banks.json').read_text(encoding='utf-8'))
count=0
for u in ('4','6'):
 for q in d['banks'][u]:
  m=q['audit']['model'];t=m['type'];actual=None
  if t=='sight':
   h=Fraction(m['eye'])+Fraction(m['target']-m['eye'])*Fraction(m['xWall']-m['xEye'],m['xTarget']-m['xEye'])
   actual=1 if h>m['wall'] else 2
  elif t=='shadow':
   lengths=[Fraction(x*m['pole'],m['lamp']-m['pole']) for x in m['distances']]
   actual=lengths.index(max(lengths))+1
  elif t=='view-order':actual=sorted(m['objects'],key=lambda x:x['x'],reverse=m['facing']=='south')[0]['id']
  elif t=='route':
   order=sorted(range(3),key=lambda i:m['pictureHeights'][i],reverse=True)
   actual=''.join(str(order[rank]+1) for rank in range(3))
   assert m['distances']==sorted(m['distances'])
  elif t=='cut':
   actual={'parallel-base':1,'axis':2}[m['direction']]
   if m['direction']=='axis':
    root=ET.fromstring(q['diagram']);ns={'s':'http://www.w3.org/2000/svg'}
    points=[tuple(map(float,s.split(','))) for s in root.find('.//s:polygon',ns).attrib['points'].split()]
    ellipses=root.findall('.//s:ellipse',ns);top=min(ellipses,key=lambda e:float(e.attrib['cy']));bottom=max(ellipses,key=lambda e:float(e.attrib['cy']))
    for i,(x,y) in enumerate(points):
     e=top if i<2 else bottom;cx,cy,rx,ry=[float(e.attrib[k]) for k in ('cx','cy','rx','ry')]
     assert abs(((x-cx)/rx)**2+((y-cy)/ry)**2-1)<1e-12,'cut corner not on rendered rim'
    for pair,e in [((points[0],points[1]),top),((points[2],points[3]),bottom)]:
     assert all(abs(sum(p[k] for p in pair)/2-float(e.attrib[c]))<1e-12 for k,c in enumerate(('cx','cy'))),'edge not a complete diameter'
  elif t=='cone-cuts':actual=m['depths'].index(max(m['depths']))+1
  elif t.startswith('layers'):
   layers=m['layers'];assert all(not v or layers[z-1][i][j] for z,g in enumerate(layers) if z for i,r in enumerate(g) for j,v in enumerate(r))
   actual=sum(v for g in layers for r in g for v in r) if t=='layers-count' else ''.join(str(v) for r in layers[1] for v in r)
  elif t.startswith('roll'):
   x,y=(0,1) if m['initial']=='top' else (1,0)
   contacts=[]
   for n in range(1,41):
    x,y=y,-x
    if (x,y)==(0,-1):contacts.append(n)
   actual=(1 if m['step'] in contacts else 2) if t=='roll-contact' else min(n for n in contacts if n>m['after'])
  else:raise ValueError(t)
  assert str(actual)==q['a']==q['audit']['expected'],(q['id'],actual,q['a'])
  assert ET.fromstring(q['diagram']).tag.endswith('svg')
  assert all(q['h']) and '答案：'+q['a'] in q['h'][2]
  count+=1
assert count==14,count
print(f'PASS: {count} original diagram answers independently checked; SVG XML and layer support valid.')
