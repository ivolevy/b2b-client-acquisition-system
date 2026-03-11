import re

with open('backend/main.py', 'r') as f:
    lines = f.readlines()

models = []
new_main = []
inside_model = False

for line in lines:
    if line.startswith('class ') and '(BaseModel):' in line:
        inside_model = True
        models.append(line)
    elif inside_model:
        if line.strip() == '' or line.startswith('    ') or line.startswith('\t') or line.startswith('#'):
            models.append(line)
        else:
            inside_model = False
            new_main.append(line)
    else:
        new_main.append(line)

with open('backend/api/schemas.py', 'w') as f:
    f.write('from pydantic import BaseModel, Field\nfrom typing import Optional, List, Dict, Any\nfrom datetime import datetime\n\n')
    f.writelines(models)

for i, line in enumerate(new_main):
    if 'from pydantic import BaseModel' in line:
        new_main.insert(i + 1, 'from backend.api.schemas import *\n')
        break

with open('backend/main.py', 'w') as f:
    f.writelines(new_main)
