# Appends translation pairs to src/i18n-en.js and src/i18n-el.js: python3 tools/add-i18n.py pairs.json
# pairs.json: {"русский ключ": ["english", "ελληνικά"], ...}
import json, sys
pairs = json.load(open(sys.argv[1]))
for path, idx in (("src/i18n-en.js", 0), ("src/i18n-el.js", 1)):
    s = open(path).read().rstrip()
    assert s.endswith("};"), path
    body = s[:-2].rstrip().rstrip(",")
    lines = "".join(f',\n  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v[idx], ensure_ascii=False)}' for k, v in pairs.items())
    open(path, "w").write(body + lines + "\n};\n")
