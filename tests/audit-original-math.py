"""Separate-language arithmetic audit for manually authored original questions.
Only literal integer arithmetic and max() are permitted; no general eval().
"""
from pathlib import Path
import ast,operator,json
base=Path(__file__).resolve().parents[1]
data=json.loads((base/'data/math-original-banks.json').read_text(encoding='utf-8'))
ops={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.FloorDiv:operator.floordiv}
def calculate(node):
    if isinstance(node,ast.Expression):return calculate(node.body)
    if isinstance(node,ast.Constant) and isinstance(node.value,int):return node.value
    if isinstance(node,ast.BinOp) and type(node.op) in ops:
        a,b=calculate(node.left),calculate(node.right)
        if isinstance(node.op,ast.FloorDiv):assert b and a%b==0,'non-exact division'
        return ops[type(node.op)](a,b)
    if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='max':return max(calculate(x) for x in node.args)
    raise ValueError('unexpected expression')
count=0
for unit,bank in data['banks'].items():
    for q in bank:
        if 'expression' not in q['audit']:continue
        actual=calculate(ast.parse(q['audit']['expression'],mode='eval'))
        assert actual==q['audit']['expected']==int(q['a']),(q['id'],actual,q['a'])
        assert len(q['h'])==3 and all(q['h'])
        count+=1
assert count==44,count
print(f'PASS: {count} original math answers independently recalculated in Python; all divisions exact.')
