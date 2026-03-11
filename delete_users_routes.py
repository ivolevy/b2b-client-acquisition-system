with open('backend/main.py', 'r') as f:
    lines = f.readlines()

# Ranges to delete (in reverse order to not mess up indices)
ranges = [
    (1788, 1846),
    (1191, 1250),
    (418, 447),
    (174, 190)
]

for start, end in sorted(ranges, reverse=True):
    del lines[start:end]

with open('backend/main.py', 'w') as f:
    f.writelines(lines)
