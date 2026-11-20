import re
import json

html_path = r"C:\Users\D Kurdistan\.gemini\antigravity\brain\2c167a8e-99b8-4944-9f43-1902baa87919\.user_uploaded\media_1795151251095_858fdab6.html"
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract provinces
# pattern: <path class="province" id="g-anbar" tabindex="0" role="button" aria-label="الأنبار" d="..."
pattern = r'<path class="province" id="g-([^"]+)"[^>]*aria-label="([^"]+)" d="([^"]+)"'
provinces = re.findall(pattern, content)
print(f"Extracted {len(provinces)} provinces")
for p_id, p_name, p_d in provinces:
    print(f"{p_id}: {p_name} ({len(p_d)} chars)")

# Extract rivers
river_pattern = r'<path class="river ([^"]+)" d="([^"]+)"'
rivers = re.findall(river_pattern, content)
print(f"Extracted {len(rivers)} rivers")
for r_cls, r_d in rivers:
    print(f"River {r_cls}: {len(r_d)} chars")
