from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from lxml import etree

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

DARK_BG = RGBColor(0x1A, 0x1A, 0x2E)
ACCENT_RED = RGBColor(0xE8, 0x3E, 0x3E)
ACCENT_BLUE = RGBColor(0x2E, 0x86, 0xAB)
ACCENT_GREEN = RGBColor(0x27, 0xAE, 0x60)
ACCENT_ORANGE = RGBColor(0xF3, 0x9C, 0x12)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xEC, 0xF0, 0xF1)
DARK_GRAY = RGBColor(0x2C, 0x3E, 0x50)
MEDIUM_GRAY = RGBColor(0x7F, 0x8C, 0x8D)
SECTION_BG = RGBColor(0x0D, 0x0D, 0x1A)
CARD_BG = RGBColor(0x25, 0x25, 0x40)
PURPLE = RGBColor(0x9B, 0x59, 0xB6)
TEAL = RGBColor(0x1A, 0xBC, 0x9C)
NAVY = RGBColor(0x34, 0x98, 0xDB)

def set_slide_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape_bg(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_rounded_rect(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_circle(slide, left, top, size, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_textbox(slide, left, top, width, height, text, font_size=18, color=WHITE, bold=False, alignment=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Calibri'
    p.alignment = alignment
    return txBox

def add_multi_text(slide, left, top, width, height, lines):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, (text, size, color, bold) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = text
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.bold = bold
        p.font.name = 'Calibri'
        p.space_after = Pt(size * 0.3)
    return txBox

def add_bullet_list(slide, left, top, width, height, items, font_size=15, color=WHITE, bullet_color=None):
    if bullet_color is None:
        bullet_color = ACCENT_RED
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = "  " + item
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = 'Calibri'
        p.space_after = Pt(6)
        pPr = p._pPr
        if pPr is None:
            pPr = etree.SubElement(p._p, '{http://schemas.openxmlformats.org/drawingml/2006/main}pPr')
        buChar = etree.SubElement(pPr, '{http://schemas.openxmlformats.org/drawingml/2006/main}buChar')
        buChar.set('char', '\u25CF')
        buClr = etree.SubElement(pPr, '{http://schemas.openxmlformats.org/drawingml/2006/main}buClr')
        srgb = etree.SubElement(buClr, '{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr')
        srgb.set('val', '{:02X}{:02X}{:02X}'.format(bullet_color[0], bullet_color[1], bullet_color[2]))
    return txBox

def add_accent_line(slide, left, top, width, color=ACCENT_RED):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(4))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_number_card(slide, left, top, number, label, color):
    add_rounded_rect(slide, left, top, Inches(2.8), Inches(1.8), CARD_BG)
    add_textbox(slide, left, top + Inches(0.2), Inches(2.8), Inches(0.8), number, 36, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, left, top + Inches(1.0), Inches(2.8), Inches(0.6), label, 14, LIGHT_GRAY, False, PP_ALIGN.CENTER)

def section_divider(title, subtitle, color, sec_num):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, SECTION_BG)
    add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), color)
    add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(max(0,color[0]-30), max(0,color[1]-30), max(0,color[2]-30)))
    add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(max(0,color[0]-30), max(0,color[1]-30), max(0,color[2]-30)))
    add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), sec_num, 20, WHITE, False, PP_ALIGN.CENTER)
    add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5), title, 48, WHITE, True, PP_ALIGN.CENTER)
    add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)
    return slide

def content_slide(title, title_color, items):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, DARK_BG)
    add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), title_color)
    add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), title, 34, WHITE, True)
    for i, (item_title, item_desc, color, points) in enumerate(items):
        row = i // 2
        col = i % 2
        x = Inches(0.4 + col * 6.5)
        y = Inches(1.5 + row * 2.9)
        add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
        add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
        add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), item_title, 16, WHITE, True)
        add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(5.8), Inches(0.6), item_desc, 11, LIGHT_GRAY, False)
        add_bullet_list(slide, x + Inches(0.2), y + Inches(1.2), Inches(5.8), Inches(1.3), points, 11, LIGHT_GRAY, (color[0], color[1], color[2]))
    return slide

# ============================================================
# SLIDE 1 - TITLE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), DARK_BG)
add_shape_bg(slide, Inches(0), Inches(5.8), Inches(13.333), Inches(1.7), ACCENT_RED)
add_circle(slide, Inches(0.5), Inches(0.5), Inches(2), ACCENT_BLUE)
add_circle(slide, Inches(11), Inches(0.3), Inches(1.5), ACCENT_RED)
add_circle(slide, Inches(10), Inches(5.5), Inches(2.5), ACCENT_GREEN)
add_textbox(slide, Inches(1.5), Inches(1.5), Inches(10.5), Inches(1), "DISASTER MANAGEMENT", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4.5), Inches(2.5), Inches(4.3), ACCENT_RED)
add_textbox(slide, Inches(1.5), Inches(2.8), Inches(10.5), Inches(1.2), "Overview of Disaster Management\nScenario in India", 32, LIGHT_GRAY, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1.5), Inches(4.3), Inches(10.5), Inches(0.5), "Bachelor of Architecture (B.Arch) | Comprehensive Study", 18, MEDIUM_GRAY, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(0), Inches(6.0), Inches(13.333), Inches(1), "From Preparedness to Resilience: Understanding India's Disaster Governance Framework", 16, WHITE, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 2 - TABLE OF CONTENTS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "TABLE OF CONTENTS", 36, WHITE, True)

toc_items = [
    ("01", "Introduction to Disaster Management", ACCENT_RED),
    ("02", "Key Definitions & Terminology", ACCENT_BLUE),
    ("03", "Types of Disasters in India", ACCENT_GREEN),
    ("04", "India's Disaster Profile & Statistics", ACCENT_ORANGE),
    ("05", "Historical Disaster Events in India", ACCENT_RED),
    ("06", "Legal & Institutional Framework", ACCENT_BLUE),
    ("07", "Disaster Management Act, 2005", ACCENT_GREEN),
    ("08", "NDMA Structure & Functions", ACCENT_ORANGE),
    ("09", "Four Pillars of Disaster Management", ACCENT_RED),
    ("10", "Prevention & Mitigation Strategies", ACCENT_BLUE),
    ("11", "Preparedness & Early Warning Systems", ACCENT_GREEN),
    ("12", "Response & Rescue Operations", ACCENT_ORANGE),
    ("13", "Rehabilitation & Reconstruction", ACCENT_RED),
    ("14", "Role of Architecture in Disaster Mgmt", ACCENT_BLUE),
    ("15", "Seismic Design for Architects", ACCENT_GREEN),
    ("16", "Building Codes & Standards", ACCENT_ORANGE),
    ("17", "Flood Management & Coastal Protection", ACCENT_RED),
    ("18", "Urban Disaster Management", ACCENT_BLUE),
    ("19", "Fire Safety in Building Design", ACCENT_GREEN),
    ("20", "Technology & Innovation in DM", ACCENT_ORANGE),
    ("21", "Community-Based Disaster Management", ACCENT_RED),
    ("22", "Climate Change & Emerging Threats", ACCENT_BLUE),
    ("23", "International Frameworks & Guidelines", ACCENT_GREEN),
    ("24", "Case Studies: Major Disasters", ACCENT_ORANGE),
    ("25", "Challenges & Future Directions", ACCENT_RED),
    ("26", "Conclusion & References", ACCENT_BLUE),
]

for i, (num, title, color) in enumerate(toc_items):
    row = i // 3
    col = i % 3
    x = Inches(0.3 + col * 4.3)
    y = Inches(1.6 + row * 0.52)
    c = add_circle(slide, x, y + Inches(0.05), Inches(0.28), color)
    add_textbox(slide, x + Inches(0.02), y + Inches(0.01), Inches(0.28), Inches(0.28), num, 9, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.4), y, Inches(3.8), Inches(0.4), title, 11, WHITE, False)

# ============================================================
# SLIDE 3 - SECTION: INTRODUCTION
# ============================================================
section_divider("Introduction to\nDisaster Management", "", ACCENT_RED, "SECTION 01")

# ============================================================
# SLIDE 4 - WHAT IS DISASTER MANAGEMENT?
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "WHAT IS DISASTER MANAGEMENT?", 36, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.6), Inches(7), Inches(2.5), [
    ("Definition", 22, ACCENT_RED, True),
    ("", 8, WHITE, False),
    ("Disaster management is the continuous and integrated process of planning, organizing, directing and controlling resources for effective coping with all aspects of disasters, from prevention and mitigation to preparedness, response, and recovery.", 16, LIGHT_GRAY, False),
])

aspects = [
    ("Planning", "Strategic frameworks\n& policy development", ACCENT_RED),
    ("Organization", "Institutional setup\n& coordination", ACCENT_BLUE),
    ("Response", "Immediate actions\npost-disaster", ACCENT_GREEN),
    ("Recovery", "Long-term restoration\n& rebuilding", ACCENT_ORANGE),
]
for i, (title, desc, color) in enumerate(aspects):
    x = Inches(0.8 + i * 3.1)
    y = Inches(4.3)
    add_rounded_rect(slide, x, y, Inches(2.8), Inches(2.5), CARD_BG)
    c = add_circle(slide, x + Inches(0.9), y + Inches(0.2), Inches(0.9), color)
    add_textbox(slide, x + Inches(0.9), y + Inches(0.35), Inches(0.9), Inches(0.5), title[0], 24, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(1.3), Inches(2.4), Inches(0.5), title, 18, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(1.8), Inches(2.4), Inches(0.7), desc, 12, MEDIUM_GRAY, False, PP_ALIGN.CENTER)

add_multi_text(slide, Inches(8.5), Inches(1.6), Inches(4.5), Inches(2.5), [
    ("Key Focus Areas", 18, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Minimizing impact of disasters", 14, LIGHT_GRAY, False),
    ("Saving lives & protecting property", 14, LIGHT_GRAY, False),
    ("Ensuring timely response", 14, LIGHT_GRAY, False),
    ("Building resilient communities", 14, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 5 - KEY DEFINITIONS
# ============================================================
definitions = [
    ("Disaster", "A sudden, calamitous event that seriously disrupts the functioning of a community or society and causes human, material, and economic or environmental losses.", ACCENT_RED),
    ("Hazard", "A dangerous phenomenon, substance, human activity, or condition that may cause loss of life, injury, health impacts, property damage.", ACCENT_BLUE),
    ("Vulnerability", "The characteristics and circumstances of a community, system or asset that make it susceptible to the damaging effects of a hazard.", ACCENT_GREEN),
    ("Risk", "The combination of the probability of an event and its negative consequences. Risk = Hazard x Vulnerability x Exposure.", ACCENT_ORANGE),
    ("Mitigation", "The effort to reduce loss of life and property by lessening the impact of disasters.", PURPLE),
    ("Resilience", "The ability of a system, community or society exposed to hazards to resist, absorb, accommodate and recover from effects.", TEAL),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "KEY DEFINITIONS & TERMINOLOGY", 36, WHITE, True)
for i, (term, definition, color) in enumerate(definitions):
    row = i // 2
    col = i % 2
    x = Inches(0.5 + col * 6.5)
    y = Inches(1.6 + row * 1.9)
    add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(1.7), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.15), Inches(5.8), Inches(0.4), term, 20, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.6), Inches(5.8), Inches(1.0), definition, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 6 - NEED FOR DM
# ============================================================
reasons = [
    ("Geographic Diversity", "India's vast geography spanning Himalayas, coastal plains, deserts makes it vulnerable to multiple hazards.", ACCENT_RED),
    ("High Population Density", "Concentrated populations in urban and coastal areas amplify disaster impacts.", ACCENT_BLUE),
    ("Economic Losses", "Disasters cause billions in economic losses annually, affecting GDP growth.", ACCENT_GREEN),
    ("Climate Change Impact", "Changing climate patterns are increasing frequency and intensity of extreme weather events.", ACCENT_ORANGE),
    ("Urbanization", "Rapid unplanned urbanization is increasing vulnerability in cities.", PURPLE),
    ("Historical Precedent", "India has experienced repeated devastating disasters, necessitating systematic preparedness.", TEAL),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "WHY IS DISASTER MANAGEMENT NECESSARY?", 34, WHITE, True)
for i, (title, desc, color) in enumerate(reasons):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.6 + row * 2.8)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.5), CARD_BG)
    c = add_circle(slide, x + Inches(1.4), y + Inches(0.2), Inches(1.0), color)
    add_textbox(slide, x + Inches(1.4), y + Inches(0.35), Inches(1.0), Inches(0.5), str(i+1), 22, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.3), y + Inches(1.3), Inches(3.4), Inches(0.4), title, 16, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.3), y + Inches(1.7), Inches(3.4), Inches(0.7), desc, 12, LIGHT_GRAY, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 7 - SECTION: TYPES OF DISASTERS
# ============================================================
section_divider("Types of Disasters\nin India", "", ACCENT_GREEN, "SECTION 02")

# ============================================================
# SLIDE 8 - NATURAL DISASTERS
# ============================================================
natural = [
    ("Earthquakes", "India lies on seismically active zone. Himalayan belt, northern plains face varying seismic risk.", ACCENT_RED, "Major: 2001 Gujarat, 2004 TSunami"),
    ("Floods & Cyclones", "Annual monsoon flooding causes widespread damage. Coastal regions face cyclones from both seas.", ACCENT_BLUE, "Major: 2013 Uttarakhand, 2020 Kerala"),
    ("Landslides", "Himalayan and Western Ghat regions experience frequent landslides due to rainfall and seismic activity.", ACCENT_GREEN, "Major: 2014 J&K, 2023 Himachal"),
    ("Droughts", "Arid and semi-arid regions face recurring droughts affecting agriculture and water supply.", ACCENT_ORANGE, "Major: 2015 Maharashtra, Rajasthan"),
    ("Tsunamis", "India's 7,517 km coastline is vulnerable to tsunamis, particularly the eastern coast.", PURPLE, "Major: 2004 Indian Ocean Tsunami"),
    ("Heat Waves", "Summer heat waves in central and northern India cause significant mortality.", RGBColor(0xE7, 0x4C, 0x3C), "Major: 2015 Andhra Pradesh, Telangana"),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "NATURAL DISASTERS IN INDIA", 36, WHITE, True)
for i, (title, desc, color, example) in enumerate(natural):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 18, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(1.3), desc, 11, LIGHT_GRAY, False)
    add_textbox(slide, x + Inches(0.2), y + Inches(2.0), Inches(3.6), Inches(0.6), example, 10, color, True)

# ============================================================
# SLIDE 9 - MAN-MADE DISASTERS
# ============================================================
manmade = [
    ("Industrial Accidents", "Bhopal Gas Tragedy (1984) remains world's worst industrial disaster.", ACCENT_RED),
    ("Building Collapses", "Rapid, unregulated construction leads to building collapses.", ACCENT_BLUE),
    ("Transportation Accidents", "Railway accidents, road crashes due to infrastructure gaps.", ACCENT_GREEN),
    ("Fires", "Urban fires in slums, commercial areas. Fire safety compliance critical.", ACCENT_ORANGE),
    ("Nuclear/Chemical Hazards", "Proximity of nuclear facilities to population centers.", PURPLE),
    ("Infrastructure Failures", "Dam failures, bridge collapses can cascade into large-scale disasters.", RGBColor(0xE7, 0x4C, 0x3C)),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "MAN-MADE DISASTERS IN INDIA", 36, WHITE, True)
for i, (title, desc, color) in enumerate(manmade):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.6 + row * 2.8)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.5), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(2.5), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.2), Inches(3.6), Inches(0.4), title, 18, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.7), Inches(3.6), Inches(1.7), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 10 - INDIA'S DISASTER PROFILE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "INDIA'S DISASTER PROFILE - KEY STATISTICS", 34, WHITE, True)
stats = [
    ("58.6%", "of land area is\nearthquake prone", ACCENT_RED),
    ("5,700 km", "of coastline vulnerable\nto cyclones & tsunamis", ACCENT_BLUE),
    ("40 million", "hectares of flood\nprone area", ACCENT_GREEN),
    ("68%", "of land is drought\nprone", ACCENT_ORANGE),
]
for i, (number, label, color) in enumerate(stats):
    add_number_card(slide, Inches(0.5 + i * 3.2), Inches(1.6), number, label, color)
stats2 = [
    ("7th", "most disaster-prone\ncountry globally", PURPLE),
    ("28 states", "affected by one or\nmore natural hazards", TEAL),
    ("$10B+", "annual economic\nloss from disasters", RGBColor(0xE7, 0x4C, 0x3C)),
    ("Zone IV-V", "high seismic risk\nfor northern India", ACCENT_ORANGE),
]
for i, (number, label, color) in enumerate(stats2):
    add_number_card(slide, Inches(0.5 + i * 3.2), Inches(3.8), number, label, color)

# ============================================================
# SLIDE 11 - SECTION: HISTORICAL EVENTS
# ============================================================
section_divider("Historical Disaster Events\nin India", "", ACCENT_BLUE, "SECTION 03")

# ============================================================
# SLIDE 12 - MAJOR HISTORICAL DISASTERS
# ============================================================
events = [
    ("1971", "Bihar Floods", "Over 1,800 deaths; massive displacement.", ACCENT_RED),
    ("1984", "Bhopal Gas Tragedy", "3,000+ dead; 500,000+ exposed.", ACCENT_BLUE),
    ("1999", "Odisha Cyclone", "10,000+ deaths; 15 million affected.", ACCENT_GREEN),
    ("2001", "Gujarat Earthquake", "20,000+ dead; Magnitude 7.7.", ACCENT_ORANGE),
    ("2004", "Indian Ocean Tsunami", "12,000+ deaths in India.", PURPLE),
    ("2013", "Uttarakhand Floods", "5,700+ dead; Kedarnath destroyed.", TEAL),
    ("2014", "J&K Floods", "277+ dead; 2.5M affected.", RGBColor(0xE7, 0x4C, 0x3C)),
    ("2015", "Chennai Floods", "500+ deaths; $3B loss.", RGBColor(0xF3, 0x9C, 0x12)),
    ("2018", "Kerala Floods", "483 dead; 1M+ displaced.", ACCENT_RED),
    ("2020", "Cyclone Amphan", "129 deaths; $13B damage.", ACCENT_BLUE),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "MAJOR HISTORICAL DISASTERS - TIMELINE", 34, WHITE, True)
for i, (year, name, desc, color) in enumerate(events):
    row = i // 5
    col = i % 5
    x = Inches(0.2 + col * 2.6)
    y = Inches(1.5 + row * 2.9)
    add_rounded_rect(slide, x, y, Inches(2.4), Inches(2.6), CARD_BG)
    c = add_circle(slide, x + Inches(0.75), y + Inches(0.15), Inches(0.9), color)
    add_textbox(slide, x + Inches(0.75), y + Inches(0.3), Inches(0.9), Inches(0.5), year, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.15), y + Inches(1.2), Inches(2.1), Inches(0.4), name, 13, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.15), y + Inches(1.6), Inches(2.1), Inches(0.9), desc, 10, LIGHT_GRAY, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 13 - LESSONS LEARNED
# ============================================================
lessons = [
    ("Early Warning Systems Work", "Cyclone preparedness in Odisha reduced deaths from 10,000+ (1999) to <100 (2019).", ACCENT_RED),
    ("Urban Planning Matters", "Chennai 2015 floods showed how unplanned urbanization amplifies flood impacts.", ACCENT_BLUE),
    ("Building Codes Save Lives", "Gujarat 2001 showed strict seismic code enforcement reduces casualties.", ACCENT_GREEN),
    ("Community Preparedness is Key", "Kerala 2018 demonstrated role of community-based disaster preparedness.", ACCENT_ORANGE),
    ("Industrial Safety Cannot Be Ignored", "Bhopal 1984 led to comprehensive industrial safety legislation.", PURPLE),
    ("Recovery Must Be Inclusive", "Post-tsunami rehabilitation showed need to address vulnerable sections.", TEAL),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "LESSONS LEARNED FROM HISTORICAL DISASTERS", 34, WHITE, True)
for i, (title, desc, color) in enumerate(lessons):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 1.9)
    add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 16, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(5.8), Inches(1.0), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 14 - SECTION: LEGAL FRAMEWORK
# ============================================================
section_divider("Legal & Institutional\nFramework", "", ACCENT_ORANGE, "SECTION 04")

# ============================================================
# SLIDE 15 - DM ACT 2005
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "DISASTER MANAGEMENT ACT, 2005", 36, WHITE, True)
add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2), [
    ("Overview", 22, ACCENT_ORANGE, True),
    ("", 6, WHITE, False),
    ("Enacted December 26, 2005 following the devastating 2004 tsunami. Provides the legal and institutional framework for disaster management in India.", 14, LIGHT_GRAY, False),
])
provisions = [
    ("NDMA Establishment", "National Disaster Management Authority under PM", ACCENT_RED),
    ("SDMA Formation", "State DM Authorities under Chief Ministers", ACCENT_BLUE),
    ("NDRF Creation", "National Disaster Response Force", ACCENT_GREEN),
    ("DM Plans", "Plans at National, State, District levels", ACCENT_ORANGE),
    ("Funding", "National & State Disaster Response Funds", PURPLE),
    ("Penalties", "Provisions for non-compliance", RGBColor(0xE7, 0x4C, 0x3C)),
]
for i, (title, desc, color) in enumerate(provisions):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(3.8 + row * 1.8)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(1.6), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(1.6), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.1), Inches(3.6), Inches(0.35), title, 15, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.5), Inches(3.6), Inches(1.0), desc, 11, LIGHT_GRAY, False)
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(2), [
    ("Key Provisions", 20, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Section 6-10: NDMA Powers & Functions", 12, LIGHT_GRAY, False),
    ("Section 11-15: SDMA Powers & Functions", 12, LIGHT_GRAY, False),
    ("Section 16-21: DDMA", 12, LIGHT_GRAY, False),
    ("Section 22-24: NDRF", 12, LIGHT_GRAY, False),
    ("Section 46-47: Response Funds", 12, LIGHT_GRAY, False),
    ("Section 51-60: Offences & Penalties", 12, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 16 - NDMA STRUCTURE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "INSTITUTIONAL FRAMEWORK - NDMA STRUCTURE", 34, WHITE, True)
ndma_box = add_rounded_rect(slide, Inches(4.5), Inches(1.5), Inches(4.3), Inches(1.2), ACCENT_RED)
add_textbox(slide, Inches(4.5), Inches(1.6), Inches(4.3), Inches(0.4), "National Disaster Management", 16, WHITE, True, PP_ALIGN.CENTER)
add_textbox(slide, Inches(4.5), Inches(2.0), Inches(4.3), Inches(0.5), "Authority (NDMA)\nChairperson: Prime Minister", 12, LIGHT_GRAY, False, PP_ALIGN.CENTER)
second = [
    ("NDRF\nNational Disaster Response Force", ACCENT_BLUE),
    ("NIDM\nNational Institute of Disaster Mgmt", ACCENT_GREEN),
    ("SDMA\nState Disaster Mgmt Authorities", ACCENT_ORANGE),
]
for i, (text, color) in enumerate(second):
    x = Inches(0.8 + i * 4.3)
    add_rounded_rect(slide, x, Inches(3.2), Inches(4.0), Inches(1.2), color)
    add_textbox(slide, x, Inches(3.3), Inches(4.0), Inches(1.0), text, 13, WHITE, True, PP_ALIGN.CENTER)
third = [
    ("DDMA\nDistrict Disaster Mgmt Authority", PURPLE),
    ("NDRF Battalions\n16 Battalions across India", TEAL),
    ("SDRF\nState Disaster Response Fund", RGBColor(0xE7, 0x4C, 0x3C)),
    ("NDRF\nNational Disaster Response Fund", ACCENT_ORANGE),
]
for i, (text, color) in enumerate(third):
    x = Inches(0.3 + i * 3.3)
    add_rounded_rect(slide, x, Inches(4.8), Inches(3.0), Inches(1.2), color)
    add_textbox(slide, x, Inches(4.9), Inches(3.0), Inches(1.0), text, 12, WHITE, True, PP_ALIGN.CENTER)
bottom = [
    ("Village Disaster\nManagement Committees", ACCENT_RED),
    ("Local Emergency\nOperations Centres", ACCENT_BLUE),
    ("Community-Based\nDisaster Management", ACCENT_GREEN),
]
for i, (text, color) in enumerate(bottom):
    x = Inches(0.8 + i * 4.3)
    add_rounded_rect(slide, x, Inches(6.3), Inches(4.0), Inches(0.9), color)
    add_textbox(slide, x, Inches(6.35), Inches(4.0), Inches(0.8), text, 11, WHITE, True, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 17 - FOUR PILLARS
# ============================================================
pillars = [
    ("PREVENTION\n& MITIGATION", "Actions to avoid or reduce adverse effects of hazards.", ACCENT_RED,
     ["Building code enforcement", "Land-use planning", "Environmental protection", "Infrastructure retrofitting"]),
    ("PREPAREDNESS", "Measures taken in advance to ensure effective response.", ACCENT_BLUE,
     ["Early warning systems", "Emergency planning", "Public awareness", "Stockpiling supplies"]),
    ("RESPONSE", "Actions taken immediately before, during, and after disaster.", ACCENT_GREEN,
     ["Search and rescue", "Emergency medical services", "Evacuation management", "Relief distribution"]),
    ("RECOVERY", "Measures to restore and improve pre-disaster conditions.", ACCENT_ORANGE,
     ["Infrastructure reconstruction", "Livelihood restoration", "Psychosocial support", "Build back better"]),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "FOUR PILLARS OF DISASTER MANAGEMENT", 36, WHITE, True)
for i, (title, desc, color, points) in enumerate(pillars):
    x = Inches(0.3 + i * 3.3)
    add_rounded_rect(slide, x, Inches(1.5), Inches(3.0), Inches(5.5), CARD_BG)
    add_shape_bg(slide, x, Inches(1.5), Inches(3.0), Inches(1.2), color)
    add_textbox(slide, x + Inches(0.1), Inches(1.6), Inches(2.8), Inches(1.0), title, 15, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.15), Inches(2.8), Inches(2.7), Inches(0.8), desc, 10, LIGHT_GRAY, False)
    add_textbox(slide, x + Inches(0.15), Inches(3.7), Inches(2.7), Inches(0.3), "Key Activities:", 11, color, True)
    add_bullet_list(slide, x + Inches(0.15), Inches(4.0), Inches(2.7), Inches(2.8), points, 10, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 18 - SECTION: PREVENTION & MITIGATION
# ============================================================
section_divider("Prevention &\nMitigation Strategies", "", ACCENT_BLUE, "SECTION 05")

# ============================================================
# SLIDE 19 - PREVENTION & MITIGATION
# ============================================================
strategies = [
    ("Structural Measures", "Physical engineering solutions.", ACCENT_RED,
     ["Seismic-resistant design", "Flood barriers & levees", "Cyclone shelters", "Dam safety programs"]),
    ("Non-Structural Measures", "Policy, planning, institutional approaches.", ACCENT_BLUE,
     ["Building codes & standards", "Land-use zoning", "Environmental assessment", "Community awareness"]),
    ("Nature-Based Solutions", "Using natural systems for DRR.", ACCENT_GREEN,
     ["Mangrove restoration", "Watershed management", "Afforestation", "Wetland preservation"]),
    ("Technological Solutions", "Modern technology for prediction.", ACCENT_ORANGE,
     ["Satellite monitoring", "IoT sensor networks", "AI prediction models", "GIS hazard mapping"]),
]
content_slide("PREVENTION & MITIGATION STRATEGIES", ACCENT_BLUE, strategies)

# ============================================================
# SLIDE 20 - SECTION: PREPAREDNESS
# ============================================================
section_divider("Preparedness &\nEarly Warning Systems", "", ACCENT_GREEN, "SECTION 06")

# ============================================================
# SLIDE 21 - EARLY WARNING SYSTEMS
# ============================================================
systems = [
    ("Cyclone Warning", "IMD provides cyclone warnings through multi-channel communication.", ACCENT_RED,
     ["Cyclone warning centers", "6-12 hour advance warning", "Mobile-based alerts", "Community dissemination"]),
    ("Flood Forecasting", "CWC monitors river levels and provides flood forecasts.", ACCENT_BLUE,
     ["Upper catchment warning", "River flow monitoring", "Reservoir inflow forecasting", "Flood inundation mapping"]),
    ("Earthquake Early Warning", "Developing EWS for Himalayan region with seismic monitoring.", ACCENT_GREEN,
     ["Seismic gap analysis", "Strong motion network", "Real-time monitoring", "P-wave based warning"]),
    ("Tsunami Warning", "ITEWC at INCOIS provides tsunami warnings post-2004.", ACCENT_ORANGE,
     ["Deep ocean buoys", "Seismic monitoring", "Tide gauge stations", "National warning centre"]),
]
content_slide("EARLY WARNING SYSTEMS IN INDIA", ACCENT_GREEN, systems)

# ============================================================
# SLIDE 22 - PREPAREDNESS MEASURES
# ============================================================
measures = [
    ("Emergency Planning", "DM plans at national, state, district, and local levels.", ACCENT_RED,
     ["Evacuation plans", "Resource allocation", "Communication protocols", "Inter-agency coordination"]),
    ("Capacity Building", "Training of officials, community volunteers, first responders.", ACCENT_BLUE,
     ["Officials training", "Volunteer programs", "Mock drills", "Simulation exercises"]),
    ("Resource Stockpiling", "Pre-positioning emergency supplies at strategic locations.", ACCENT_GREEN,
     ["Food and water reserves", "Medical supplies", "Tents and shelters", "Rescue equipment"]),
    ("Public Awareness", "Community education, school curricula, media campaigns.", ACCENT_ORANGE,
     ["School programs", "Media campaigns", "Community drills", "Digital awareness"]),
    ("Communication Systems", "Multi-modal networks: satellite, radio, mobile, internet.", PURPLE,
     ["Satellite phones", "Emergency radio", "Mobile alerts", "Internet systems"]),
    ("Financial Preparedness", "Pre-arranged emergency funds, insurance mechanisms.", RGBColor(0xE7, 0x4C, 0x3C),
     ["Emergency funds", "Insurance schemes", "Contingency budgets", "Rapid release mechanisms"]),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "DISASTER PREPAREDNESS MEASURES", 36, WHITE, True)
for i, (title, desc, color, points) in enumerate(measures):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(1.0), desc, 11, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.3), Inches(3.6), Inches(1.2), points, 10, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 23 - SECTION: RESPONSE
# ============================================================
section_divider("Response &\nRescue Operations", "", PURPLE, "SECTION 07")

# ============================================================
# SLIDE 24 - RESPONSE & RESCUE
# ============================================================
response = [
    ("NDRF", "Specialized force with 16 battalions. Trained in search, rescue, and medical ops.", ACCENT_RED,
     ["6,000+ trained personnel", "Life detectors & cutting tools", "Community awareness programs", "International response"]),
    ("Indian Armed Forces", "Military provides critical support. Often first responders in remote areas.", ACCENT_BLUE,
     ["Rapid troop deployment", "Air rescue operations", "Engineering support", "Field hospitals"]),
    ("Medical Response", "National/state medical teams for trauma care, disease surveillance.", ACCENT_GREEN,
     ["Emergency medical teams", "Mobile medical units", "Disease outbreak prevention", "Psychosocial support"]),
    ("Evacuation Management", "Systematic evacuation to safe locations with pre-identified shelters.", ACCENT_ORANGE,
     ["Pre-mapped evacuation routes", "Temporary relief camps", "Transport coordination", "Vulnerable group provisions"]),
]
content_slide("DISASTER RESPONSE & RESCUE OPERATIONS", PURPLE, response)

# ============================================================
# SLIDE 25 - SECTION: REHABILITATION
# ============================================================
section_divider("Rehabilitation &\nReconstruction", "", RGBColor(0xE7, 0x4C, 0x3C), "SECTION 08")

# ============================================================
# SLIDE 26 - REHABILITATION
# ============================================================
rehab = [
    ("Short-term Rehabilitation", "Immediate restoration of basic services and living conditions.", ACCENT_RED,
     ["Temporary shelter", "Water supply restoration", "Emergency healthcare", "Cash transfer programs"]),
    ("Long-term Reconstruction", "Permanent rebuilding of infrastructure and communities.", ACCENT_BLUE,
     ["Housing reconstruction", "Infrastructure rebuilding", "Economic rehabilitation", "Social infrastructure"]),
    ("Livelihood Restoration", "Restoring income sources and economic activities.", ACCENT_GREEN,
     ["Agricultural recovery", "Small business support", "Skill development", "Credit/financial support"]),
    ("Psychosocial Recovery", "Addressing mental health and social well-being.", ACCENT_ORANGE,
     ["Trauma counseling", "Community support groups", "School rehabilitation", "Cultural heritage restoration"]),
]
content_slide("REHABILITATION & RECONSTRUCTION", RGBColor(0xE7, 0x4C, 0x3C), rehab)

# ============================================================
# SLIDE 27 - SECTION: ARCHITECTURE'S ROLE
# ============================================================
section_divider("Role of Architecture\nin Disaster Management", "", TEAL, "SECTION 09")

# ============================================================
# SLIDE 28 - ARCHITECTURE & DM
# ============================================================
arch_roles = [
    ("Disaster-Resistant Design", "Designing structures that withstand disasters.", ACCENT_RED,
     ["Seismic-resistant systems", "Flood-proof construction", "Wind-resistant forms", "Fire-safe design"]),
    ("Urban Planning & Zoning", "Strategic planning reduces vulnerability.", ACCENT_BLUE,
     ["Hazard mapping integration", "Setback regulations", "Open space preservation", "Green infrastructure"]),
    ("Post-Disaster Reconstruction", "Leading design of reconstruction efforts.", ACCENT_GREEN,
     ["Participatory design", "Cultural sensitivity", "Sustainable materials", "Community-centered design"]),
    ("Resilient Infrastructure", "Designing infrastructure that resists and recovers.", ACCENT_ORANGE,
     ["Critical facility protection", "Lifeline infrastructure", "Modular adaptable systems", "Climate-responsive design"]),
]
content_slide("ARCHITECTURE & DISASTER MANAGEMENT", TEAL, arch_roles)

# ============================================================
# SLIDE 29 - SEISMIC DESIGN
# ============================================================
seismic = [
    ("IS 1893:2016", "Indian Standard for earthquake-resistant design. 4 seismic zones.", ACCENT_RED,
     ["Response spectrum method", "Equivalent static method", "Performance-based design"]),
    ("Structural Systems", "Moment frames, shear walls, braced frames, base isolation.", ACCENT_BLUE,
     ["Moment-resisting frames", "Shear wall systems", "Base isolation technology"]),
    ("Plan Configuration", "Symmetric plans reduce torsional effects.", ACCENT_GREEN,
     ["Symmetric floor plans", "Avoid L, T, U shapes", "Regular configurations"]),
    ("Material Selection", "Ductile materials for seismic energy absorption.", ACCENT_ORANGE,
     ["Ductile steel and concrete", "Proper detailing requirements", "Quality material selection"]),
    ("Non-Structural Elements", "Proper anchorage of partitions, ceilings, equipment.", PURPLE,
     ["Partition wall anchorage", "Ceiling suspension systems", "Equipment bracing"]),
    ("Foundation Design", "Systems considering soil, liquefaction, seismic forces.", RGBColor(0xE7, 0x4C, 0x3C),
     ["Soil-structure interaction", "Liquefaction assessment", "Deep foundation options"]),
]
content_slide("SEISMIC DESIGN PRINCIPLES FOR ARCHITECTS", ACCENT_RED, seismic)

# ============================================================
# SLIDE 30 - SECTION: BUILDING CODES
# ============================================================
section_divider("Building Codes &\nStandards", "", NAVY, "SECTION 10")

# ============================================================
# SLIDE 31 - INDIAN BUILDING CODES
# ============================================================
codes = [
    ("IS 1893:2016", "Earthquake Resistant Design. 4 seismic zones (II-V).", ACCENT_RED,
     ["Response spectrum method", "Equivalent static method", "Performance-based design"]),
    ("IS 4326:2013", "Earthquake Resistant Construction of Buildings.", ACCENT_BLUE,
     ["Masonry guidelines", "RC detailing", "Construction quality control"]),
    ("IS 13920:2016", "Ductile Detailing of RC Structures.", ACCENT_GREEN,
     ["Confinement reinforcement", "Strong column-weak beam", "Joint detailing"]),
    ("IS 875:2015", "Design Loads - wind, flood, environmental.", ACCENT_ORANGE,
     ["Wind load calculations", "Snow load requirements", "Load combinations"]),
    ("IS 15988:2012", "Seismic Assessment & Retrofitting.", PURPLE,
     ["Damage assessment", "Retrofitting techniques", "Priority-based approach"]),
    ("NBC 2016", "National Building Code - comprehensive.", TEAL,
     ["Fire safety provisions", "Structural safety", "Accessibility standards"]),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0x34, 0x98, 0xDB))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "INDIAN BUILDING CODES FOR DISASTER RESISTANCE", 32, WHITE, True)
for i, (title, desc, color, points) in enumerate(codes):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(3.6), Inches(0.8), desc, 10, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.4), Inches(3.6), Inches(1.2), points, 10, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 32 - SEISMIC ZONES
# ============================================================
zones = [
    ("Zone II", "Low Damage Risk", "PGA: 0.10g", RGBColor(0x27, 0xAE, 0x60)),
    ("Zone III", "Moderate Damage Risk", "PGA: 0.16g", RGBColor(0xF3, 0x9C, 0x12)),
    ("Zone IV", "High Damage Risk", "PGA: 0.24g", RGBColor(0xE7, 0x4C, 0x3C)),
    ("Zone V", "Very High Damage Risk", "PGA: 0.36g", RGBColor(0xC0, 0x39, 0x2B)),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "SEISMIC ZONE MAP OF INDIA (IS 1893)", 36, WHITE, True)
for i, (zone, name, desc, color) in enumerate(zones):
    x = Inches(0.4 + i * 3.2)
    y = Inches(1.5)
    add_rounded_rect(slide, x, y, Inches(3.0), Inches(2.5), CARD_BG)
    add_shape_bg(slide, x, y, Inches(3.0), Inches(0.6), color)
    add_textbox(slide, x + Inches(0.1), y + Inches(0.1), Inches(2.8), Inches(0.5), zone, 20, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.1), y + Inches(0.7), Inches(2.8), Inches(0.4), name, 13, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.1), y + Inches(1.2), Inches(2.8), Inches(1.2), desc, 12, LIGHT_GRAY, False, PP_ALIGN.CENTER)
add_multi_text(slide, Inches(0.8), Inches(4.3), Inches(12), Inches(3), [
    ("Zone Classification Criteria", 20, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Based on Maximum Considered Earthquake (MCE) and Peak Ground Acceleration (PGA)", 13, LIGHT_GRAY, False),
    ("Zone V is most seismically active; requires strictest design provisions", 13, LIGHT_GRAY, False),
    ("80% of India is prone to earthquakes - only 12% in Zone IV and V", 13, LIGHT_GRAY, False),
    ("Architects must ensure compliance with seismic zone of location", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 33 - SECTION: FLOOD MANAGEMENT
# ============================================================
section_divider("Flood Management &\nCoastal Protection", "", ACCENT_BLUE, "SECTION 11")

# ============================================================
# SLIDE 34 - FLOOD MANAGEMENT
# ============================================================
flood = [
    ("Flood-Prone Areas", "40M hectares flood-prone, 30M people affected annually.", ACCENT_RED,
     ["Brahmaputra: most flood-prone", "Rs 1,800+ crore annual damage", "Assam, Bihar, UP most affected", "Urban flooding increasing"]),
    ("Flood Control Measures", "Structural and non-structural measures.", ACCENT_BLUE,
     ["Embankments (3,500+ km)", "Flood shelters", "River training works", "Dam operations"]),
    ("Drainage Improvement", "Critical for urban flood management.", ACCENT_GREEN,
     ["Storm water drainage", "Retention basins", "Permeable paving", "Green infrastructure"]),
    ("River Basin Management", "Comprehensive river basin approach.", ACCENT_ORANGE,
     ["Inter-linking of rivers", "Floodplain zoning", "Watershed management", "Afforestation"]),
]
content_slide("FLOOD MANAGEMENT IN INDIA", ACCENT_BLUE, flood)

# ============================================================
# SLIDE 35 - COASTAL DISASTER MGMT
# ============================================================
coastal = [
    ("Cyclone Prone Areas", "7,517 km coastline, 5-6 cyclones annually.", ACCENT_RED,
     ["Eastern coast most prone", "Bay of Bengal 4-5x more active", "Intensity increasing", "Storm surge 5-10 meters"]),
    ("Coastal Protection", "Multi-layered defense systems.", ACCENT_BLUE,
     ["Cyclone shelters (1,000+)", "Mangrove bio-shields", "Seawalls & groynes", "Early warning systems"]),
    ("CRZ Regulations", "Coastal Regulation Zone notifications.", ACCENT_GREEN,
     ["CRZ-I: Ecologically sensitive", "CRZ-II: Urban areas", "CRZ-III: Rural areas", "CRZ-IV: Water areas"]),
    ("Adaptation Strategies", "Climate-resilient coastal development.", ACCENT_ORANGE,
     ["Elevated construction", "Wind-resistant design", "Saline-resistant agriculture", "Managed retreat"]),
]
content_slide("COASTAL DISASTER MANAGEMENT", TEAL, coastal)

# ============================================================
# SLIDE 36 - SECTION: URBAN DM
# ============================================================
section_divider("Urban Disaster\nManagement", "", PURPLE, "SECTION 12")

# ============================================================
# SLIDE 37 - URBAN VULNERABILITY
# ============================================================
urban = [
    ("Rapid Urbanization", "Urban pop to reach 600M by 2031. Unplanned growth increases risk.", ACCENT_RED,
     ["40% GDP from urban", "65% urban housing informal", "Density exceeds limits", "Sprawl into hazard zones"]),
    ("Infrastructure Deficits", "Critical infrastructure lacks disaster resilience.", ACCENT_BLUE,
     ["60%+ buildings non-compliant", "Aging water/drainage", "Inadequate fire safety", "Weak electrical systems"]),
    ("Slum Vulnerability", "65M+ people in urban slums, highly vulnerable.", ACCENT_GREEN,
     ["Temporary structures", "No tenure security", "Poor sanitation", "Hazard-prone locations"]),
    ("Urban Heat Island", "Cities 2-8C hotter than rural areas.", ACCENT_ORANGE,
     ["Concrete/asphalt absorption", "Reduced green cover", "Waste heat from vehicles", "Health impacts"]),
]
content_slide("URBAN VULNERABILITY & RISK IN INDIA", PURPLE, urban)

# ============================================================
# SLIDE 38 - URBAN RESILIENCE
# ============================================================
urban_res = [
    ("Smart City Initiatives", "Integration of DM into Smart City Mission.", ACCENT_RED,
     ["Real-time monitoring", "IoT-based early warning", "GIS risk mapping", "Emergency response apps"]),
    ("Urban Planning Reforms", "Incorporating DRR into planning.", ACCENT_BLUE,
     ["Hazard-sensitive planning", "Building code enforcement", "Open space preservation", "Green infrastructure"]),
    ("Infrastructure Upgrades", "Making infrastructure resilient.", ACCENT_GREEN,
     ["Critical facility strengthening", "Underground utilities", "Flood-resistant roads", "EQ-resistant bridges"]),
    ("Community Engagement", "Building community capacity.", ACCENT_ORANGE,
     ["Ward-level DM plans", "Community response teams", "Resident awareness", "School preparedness"]),
]
content_slide("URBAN DISASTER RESILIENCE STRATEGIES", PURPLE, urban_res)

# ============================================================
# SLIDE 39 - SECTION: FIRE SAFETY
# ============================================================
section_divider("Fire Safety in\nBuilding Design", "", ACCENT_RED, "SECTION 13")

# ============================================================
# SLIDE 40 - FIRE SAFETY
# ============================================================
fire = [
    ("Fire Statistics", "1.5 lakh+ fire incidents annually causing 2,000+ deaths.", ACCENT_RED,
     ["1,50,000+ incidents/year", "2,000+ deaths/year", "Rs 1,500+ crore loss", "Delhi, Mumbai highest risk"]),
    ("Building Classification", "NBC classifies by height, occupancy, construction.", ACCENT_BLUE,
     ["Group A: Residential", "Group B: Educational", "Group C: Assembly/Business", "Group H: High-hazard"]),
    ("Fire Safety Measures", "Essential fire protection systems by occupancy.", ACCENT_GREEN,
     ["Fire escape staircases", "Sprinkler systems", "Fire alarm systems", "Smoke extraction"]),
    ("Means of Egress", "Safe evacuation routes for emergency.", ACCENT_ORANGE,
     ["Staircase width reqs", "Max travel distance", "Emergency exit signage", "Illumination requirements"]),
]
content_slide("FIRE SAFETY IN BUILDING DESIGN", ACCENT_RED, fire)

# ============================================================
# SLIDE 41 - SECTION: TECHNOLOGY
# ============================================================
section_divider("Technology in\nDisaster Management", "", TEAL, "SECTION 14")

# ============================================================
# SLIDE 42 - TECHNOLOGY & INNOVATION
# ============================================================
tech = [
    ("GIS & Remote Sensing", "Hazard mapping, risk assessment, damage evaluation.", ACCENT_RED,
     ["Hazard zone mapping", "Real-time flood monitoring", "Post-disaster assessment", "Land-use detection"]),
    ("AI & Machine Learning", "Predictive modeling, pattern recognition, early warning.", ACCENT_BLUE,
     ["Disaster prediction", "Image recognition", "Chatbots for info", "Resource optimization"]),
    ("Drone Technology", "Surveillance, damage assessment, supply delivery.", ACCENT_GREEN,
     ["Aerial damage assessment", "Search & rescue support", "Supply delivery", "Infrastructure inspection"]),
    ("IoT & Sensors", "Real-time monitoring of conditions and infrastructure.", ACCENT_ORANGE,
     ["Flood level sensors", "Structural health monitoring", "Weather station networks", "Early warning triggers"]),
]
content_slide("TECHNOLOGY & INNOVATION IN DM", TEAL, tech)

# ============================================================
# SLIDE 43 - SECTION: COMMUNITY DM
# ============================================================
section_divider("Community-Based\nDisaster Management", "", ACCENT_ORANGE, "SECTION 15")

# ============================================================
# SLIDE 44 - COMMUNITY DM
# ============================================================
community = [
    ("Community Preparedness", "Building local capacity for disaster response.", ACCENT_RED,
     ["Village DM committees", "Local volunteer training", "Mock drills & exercises", "Resource mapping"]),
    ("Indigenous Knowledge", "Traditional wisdom for disaster resilience.", ACCENT_BLUE,
     ["Traditional construction", "Local early warning signs", "Water harvesting systems", "Crop selection knowledge"]),
    ("Social Capital", " Networks and trust that enable collective action.", ACCENT_GREEN,
     ["Neighborhood associations", "Self-help groups", "Religious organizations", "Professional networks"]),
    ("Participatory Planning", "Involving communities in DM decision-making.", ACCENT_ORANGE,
     ["Community risk mapping", "Participatory budgeting", "Local DM plan creation", "Monitoring & evaluation"]),
]
content_slide("COMMUNITY-BASED DISASTER MANAGEMENT", ACCENT_ORANGE, community)

# ============================================================
# SLIDE 45 - SECTION: CLIMATE CHANGE
# ============================================================
section_divider("Climate Change &\nEmerging Threats", "", RGBColor(0xE7, 0x4C, 0x3C), "SECTION 16")

# ============================================================
# SLIDE 46 - CLIMATE CHANGE
# ============================================================
climate = [
    ("Rising Sea Levels", "Coastal cities face increasing threats.", ACCENT_RED,
     ["0.3mm annual rise", "Coastal erosion accelerating", "Saltwater intrusion", "Island territories at risk"]),
    ("Extreme Weather", "Increasing cyclones, heat waves, rainfall.", ACCENT_BLUE,
     ["Cyclone intensity rising", "Heat wave frequency up", "Extreme rainfall common", "Urban heat islands"]),
    ("Water Stress", "Changing monsoon and glacier retreat.", ACCENT_GREEN,
     ["Himalayan glaciers retreating", "Erratic monsoons", "Groundwater depletion", "Inter-state disputes"]),
    ("Pandemic Preparedness", "COVID-19 highlighted health-DM intersection.", ACCENT_ORANGE,
     ["Health infrastructure stress", "Supply chain disruption", "Economic impacts", "Pandemic plans needed"]),
]
content_slide("CLIMATE CHANGE & EMERGING THREATS", RGBColor(0xE7, 0x4C, 0x3C), climate)

# ============================================================
# SLIDE 47 - DRR
# ============================================================
drr = [
    ("Risk Identification", "Systematic process of determining risk.", ACCENT_RED,
     ["Hazard mapping", "Vulnerability assessment", "Exposure analysis", "Capacity inventory"]),
    ("Risk Management", "Making decisions that reduce risk.", ACCENT_BLUE,
     ["Risk evaluation", "Prioritization", "Implementation planning", "Monitoring & evaluation"]),
    ("Risk Financing", "Mechanisms to finance recovery.", ACCENT_GREEN,
     ["NDRF, SDRF", "Insurance mechanisms", "Catastrophe bonds", "Contingency funds"]),
    ("Risk Transfer", "Moving risk through financial instruments.", ACCENT_ORANGE,
     ["Crop insurance", "Weather-based insurance", "Parametric insurance", "Risk pooling"]),
]
content_slide("DISASTER RISK REDUCTION (DRR)", ACCENT_GREEN, drr)

# ============================================================
# SLIDE 48 - CASE STUDIES SECTION
# ============================================================
section_divider("Case Studies:\nMajor Disasters in India", "", ACCENT_ORANGE, "SECTION 17")

# ============================================================
# SLIDE 49 - CASE STUDY: 2004 TSUNAMI
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2004 INDIAN OCEAN TSUNAMI", 34, WHITE, True)
add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, ACCENT_RED, True), ("", 6, WHITE, False),
    ("Date: December 26, 2004", 14, LIGHT_GRAY, False),
    ("Magnitude: 9.1 undersea earthquake", 14, LIGHT_GRAY, False),
    ("India: 12,000+ deaths, 5.6 lakh displaced", 14, LIGHT_GRAY, False),
    ("Affected: TN, AP, Kerala, Andaman & Nicobar", 14, LIGHT_GRAY, False),
])
impact_data = [("12,000+", "Deaths in India", ACCENT_RED), ("5.6L", "Displaced", ACCENT_BLUE), ("$1.5B", "Economic Loss", ACCENT_GREEN), ("40,000", "Fishermen affected", ACCENT_ORANGE)]
for i, (num, label, color) in enumerate(impact_data):
    add_number_card(slide, Inches(0.5 + i * 3.2), Inches(4.0), num, label, color)
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Key Lessons & Response", 20, ACCENT_BLUE, True), ("", 6, WHITE, False),
    ("Led to creation of ITEWC (Tsunami Warning Centre)", 13, LIGHT_GRAY, False),
    ("Installation of tsunami detection buoys", 13, LIGHT_GRAY, False),
    ("Community-based early warning systems", 13, LIGHT_GRAY, False),
    ("Mangrove restoration as natural barrier", 13, LIGHT_GRAY, False),
    ("Coastal regulation zone enforcement", 13, LIGHT_GRAY, False),
])
add_multi_text(slide, Inches(7), Inches(4.0), Inches(5.5), Inches(2.5), [
    ("Architectural Response", 20, ACCENT_GREEN, True), ("", 6, WHITE, False),
    ("Redesign of coastal settlements", 13, LIGHT_GRAY, False),
    ("Multi-story cyclone shelters", 13, LIGHT_GRAY, False),
    ("Traditional building techniques revisited", 13, LIGHT_GRAY, False),
    ("Disaster-resilient housing reconstruction", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 50 - CASE STUDY: 2001 GUJARAT EQ
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2001 GUJARAT EARTHQUAKE", 34, WHITE, True)
add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, ACCENT_BLUE, True), ("", 6, WHITE, False),
    ("Date: January 26, 2001 (Republic Day)", 14, LIGHT_GRAY, False),
    ("Magnitude: 7.7 on Richter scale", 14, LIGHT_GRAY, False),
    ("Epicenter: Near Bhuj, Gujarat", 14, LIGHT_GRAY, False),
    ("20,000+ deaths, 167,000 injured", 14, LIGHT_GRAY, False),
])
impact2 = [("20,000+", "Deaths", ACCENT_RED), ("1.67L", "Injured", ACCENT_BLUE), ("$5B", "Damage", ACCENT_GREEN), ("3.4L", "Buildings collapsed", ACCENT_ORANGE)]
for i, (num, label, color) in enumerate(impact2):
    add_number_card(slide, Inches(0.5 + i * 3.2), Inches(4.0), num, label, color)
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(5), [
    ("Key Architectural Lessons", 20, ACCENT_GREEN, True), ("", 6, WHITE, False),
    ("Unreinforced masonry primary cause of collapse", 13, LIGHT_GRAY, False),
    ("Poor construction quality amplified damage", 13, LIGHT_GRAY, False),
    ("Lack of seismic zone compliance", 13, LIGHT_GRAY, False),
    ("Post-disaster: Strengthened building codes", 13, LIGHT_GRAY, False),
    ("Seismic retrofitting programs introduced", 13, LIGHT_GRAY, False),
    ("Rural construction quality improvement", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 51 - CASE STUDY: 2018 KERALA
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), PURPLE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2018 KERALA FLOODS", 36, WHITE, True)
add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, PURPLE, True), ("", 6, WHITE, False),
    ("Worst flooding in Kerala in 100 years", 14, LIGHT_GRAY, False),
    ("483 deaths, 1 million+ displaced", 14, LIGHT_GRAY, False),
    ("22 of 39 districts affected", 14, LIGHT_GRAY, False),
    ("Major dams opened simultaneously", 14, LIGHT_GRAY, False),
])
impact4 = [("483", "Deaths", ACCENT_RED), ("10L+", "Displaced", ACCENT_BLUE), ("$4.4B", "Damage", ACCENT_GREEN), ("33 dams", "Opened", ACCENT_ORANGE)]
for i, (num, label, color) in enumerate(impact4):
    add_number_card(slide, Inches(0.5 + i * 3.2), Inches(4.0), num, label, color)
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(5), [
    ("Key Lessons", 20, ACCENT_RED, True), ("", 6, WHITE, False),
    ("Sand mining from riverbeds increased flooding", 13, LIGHT_GRAY, False),
    ("Encroachment on flood plains a major factor", 13, LIGHT_GRAY, False),
    ("Community response was exemplary", 13, LIGHT_GRAY, False),
    ("Need for dam water management protocols", 13, LIGHT_GRAY, False),
    ("Urban planning must respect water bodies", 13, LIGHT_GRAY, False),
    ("House-level flood resilience needed", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 52 - CASE STUDY: 2013 UTTARAKHAND
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2013 UTTARAKHAND FLOODS", 36, WHITE, True)
add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, ACCENT_GREEN, True), ("", 6, WHITE, False),
    ("Caused by: Cloudburst + Glacial Lake Outburst", 14, LIGHT_GRAY, False),
    ("5,700+ deaths (official)", 14, LIGHT_GRAY, False),
    ("4,200 villages affected", 14, LIGHT_GRAY, False),
    ("Massive infrastructure destruction", 14, LIGHT_GRAY, False),
])
impact3 = [("5,700+", "Deaths", ACCENT_RED), ("4,200", "Villages", ACCENT_BLUE), ("~$2B", "Loss", ACCENT_GREEN), ("100K+", "Stranded", ACCENT_ORANGE)]
for i, (num, label, color) in enumerate(impact3):
    add_number_card(slide, Inches(0.5 + i * 3.2), Inches(4.0), num, label, color)
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(5), [
    ("Architectural Lessons", 20, ACCENT_ORANGE, True), ("", 6, WHITE, False),
    ("Unregulated construction on river banks", 13, LIGHT_GRAY, False),
    ("Encroachment on natural flood paths", 13, LIGHT_GRAY, False),
    ("Need for hill area building regulations", 13, LIGHT_GRAY, False),
    ("Slope stability in design critical", 13, LIGHT_GRAY, False),
    ("Climate-resilient infrastructure needed", 13, LIGHT_GRAY, False),
    ("Traditional water systems ignored", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 53 - INTERNATIONAL FRAMEWORKS
# ============================================================
frameworks = [
    ("Sendai Framework 2015-2030", "Global agreement for DRR. 4 priorities.", ACCENT_RED,
     ["India is signatory", "7 targets, 4 priorities", "Local level focus", "UNDRR monitoring"]),
    ("SDGs & Disaster Risk", "SDGs integrate DRR. Goal 11 for sustainable cities.", ACCENT_BLUE,
     ["Goal 11: Sustainable Cities", "Goal 13: Climate Action", "Integration across goals", "National reviews"]),
    ("NDMA Guidelines", "Comprehensive hazard-specific guidelines.", ACCENT_GREEN,
     ["National guidelines", "Sector-specific guidelines", "Minimum standards", "Capacity building"]),
    ("Hyogo Framework 2005-2015", "Predecessor to Sendai. Influenced India's DM Act.", ACCENT_ORANGE,
     ["5 priorities", "Built-in review", "Capacity building focus", "Compliance reporting"]),
]
content_slide("INTERNATIONAL FRAMEWORKS & GUIDELINES", ACCENT_BLUE, frameworks)

# ============================================================
# SLIDE 54 - CHALLENGES
# ============================================================
challenges = [
    ("Institutional Gaps", "Coordination between multiple agencies remains challenging.", ACCENT_RED),
    ("Funding Constraints", "Insufficient allocation. Most spent on response not preparedness.", ACCENT_BLUE),
    ("Urban Vulnerability", "Rapid unplanned urbanization increases disaster risk.", ACCENT_GREEN),
    ("Awareness Deficit", "Low disaster awareness in communities.", ACCENT_ORANGE),
    ("Data Gaps", "Lack of comprehensive, updated hazard data.", PURPLE),
    ("Climate Change", "Increasing variability creating new risks.", RGBColor(0xE7, 0x4C, 0x3C)),
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0xE7, 0x4C, 0x3C))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CHALLENGES IN INDIAN DISASTER MANAGEMENT", 34, WHITE, True)
for i, (title, desc, color) in enumerate(challenges):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(2.0), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 55 - BEST PRACTICES
# ============================================================
success = [
    ("Odisha Cyclone Preparedness", "Deaths reduced from 10,000+ to <100 through warnings & shelters.", ACCENT_RED,
     ["Robust early warning", "Cyclone shelters built", "Mass evacuation drills", "Community participation"]),
    ("Kerala Community Response 2018", "Fishing communities created exemplary response model.", ACCENT_BLUE,
     ["Fishing boats for rescue", "Volunteer coordination", "Social media mobilization", "Local governance role"]),
    ("Gujarat Reconstruction", "Post-2001 focus on seismic-resistant construction model.", ACCENT_GREEN,
     ["Building code enforcement", "Retrofitting programs", "Quality control systems", "Training programs"]),
    ("NDRF Professionalization", "Specialized force with international training.", ACCENT_ORANGE,
     ["International training", "Specialized equipment", "Rapid deployment", "Multi-hazard capability"]),
    ("Smart City DM Integration", "Technology-driven disaster management in cities.", PURPLE,
     ["IoT monitoring systems", "Real-time dashboards", "Citizen apps", "Data-driven decisions"]),
    ("Community DM Programs", "Village-level committees showing results.", TEAL,
     ["Local committees formed", "Volunteer training", "Resource mapping", "Mock drill programs"]),
]
content_slide("BEST PRACTICES & SUCCESS STORIES", ACCENT_GREEN, success)

# ============================================================
# SLIDE 56 - FUTURE DIRECTIONS
# ============================================================
future = [
    ("Strengthen Institutions", "Enhance coordination, funding, capacity at state/district levels.", ACCENT_RED,
     ["Multi-agency coordination", "Adequate funding", "Capacity building", "Accountability mechanisms"]),
    ("Technology Integration", "Leverage AI, IoT, drones for early warning & response.", ACCENT_BLUE,
     ["AI prediction models", "IoT sensor networks", "Drone surveillance", "Data analytics platforms"]),
    ("Community-Centric Approach", "Involve communities in planning, preparedness, response.", ACCENT_GREEN,
     ["Participatory planning", "Local volunteer networks", "Community drills", "Traditional knowledge"]),
    ("Climate Adaptation", "Integrate DRR with climate change adaptation strategies.", ACCENT_ORANGE,
     ["Climate-resilient infrastructure", "Nature-based solutions", "Adaptive management", "Risk assessment updates"]),
    ("Urban Resilience", "Comprehensive urban DM plans in governance.", PURPLE,
     ["City-level DM plans", "Building code enforcement", "Green infrastructure", "Emergency preparedness"]),
    ("Research & Innovation", "Invest in DM research for India's unique challenges.", RGBColor(0xE7, 0x4C, 0x3C),
     ["Indigenous solutions", "Academic research", "Field testing", "Knowledge sharing"]),
]
content_slide("FUTURE DIRECTIONS & RECOMMENDATIONS", ACCENT_ORANGE, future)

# ============================================================
# SLIDE 57 - CONCLUSION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CONCLUSION", 42, WHITE, True)
add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(12), Inches(1.5), [
    ("India faces a wide spectrum of disasters. The framework has evolved significantly since 2001 and 2004, culminating in the DM Act 2005 and NDMA.", 15, LIGHT_GRAY, False),
])
conclusions = [
    ("Progress Made", "Significant progress in institutional framework, early warning, response capabilities.", ACCENT_RED),
    ("Gaps Remain", "Implementation, funding, urban vulnerability, awareness gaps need urgent attention.", ACCENT_BLUE),
    ("Role of Architecture", "Architects vital in disaster-resistant design, planning, reconstruction.", ACCENT_GREEN),
    ("Way Forward", "Holistic approach: technology, community, climate adaptation, resilient design.", ACCENT_ORANGE),
]
for i, (title, desc, color) in enumerate(conclusions):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(3.3 + row * 2.0)
    add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.8), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(5.8), Inches(1.1), desc, 13, LIGHT_GRAY, False)

# ============================================================
# SLIDE 58 - REFERENCES
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), MEDIUM_GRAY)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "REFERENCES & FURTHER READING", 36, WHITE, True)
refs = [
    "Disaster Management Act, 2005",
    "National Disaster Management Authority (NDMA) - ndma.gov.in",
    "National Institute of Disaster Management (NIDM) - nidm.gov.in",
    "India Meteorological Department (IMD) - mausam.imd.gov.in",
    "IS 1893:2016 - Earthquake Resistant Design",
    "Sendai Framework for DRR 2015-2030",
    "UNDRR Global Assessment Report",
    "National Disaster Response Force (NDRF)",
    "India Tsunami Early Warning Centre (ITEWC)",
    "National Cyclone Risk Mitigation Project",
    "NBC 2016 - National Building Code",
    "Post-Disaster Needs Assessment Reports",
]
for i, ref in enumerate(refs):
    row = i // 2
    col = i % 2
    x = Inches(0.5 + col * 6.5)
    y = Inches(1.5 + row * 0.45)
    add_textbox(slide, x, y, Inches(6.2), Inches(0.4), "  " + ref, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 59 - THANK YOU
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_circle(slide, Inches(0.5), Inches(0.5), Inches(2), ACCENT_RED)
add_circle(slide, Inches(11), Inches(0.3), Inches(1.5), ACCENT_BLUE)
add_circle(slide, Inches(10), Inches(5.5), Inches(2.5), ACCENT_GREEN)
add_circle(slide, Inches(1), Inches(5), Inches(1.8), ACCENT_ORANGE)
add_textbox(slide, Inches(1), Inches(2.0), Inches(11), Inches(1.5), "THANK YOU", 64, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(3.5), Inches(5.3), ACCENT_RED)
add_textbox(slide, Inches(1), Inches(3.8), Inches(11), Inches(1), "Overview of Disaster Management\nScenario in India", 24, LIGHT_GRAY, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(5.0), Inches(11), Inches(0.5), "Bachelor of Architecture (B.Arch)", 18, MEDIUM_GRAY, False, PP_ALIGN.CENTER)
add_shape_bg(slide, Inches(0), Inches(6.0), Inches(13.333), Inches(1.5), ACCENT_RED)
add_textbox(slide, Inches(0), Inches(6.2), Inches(13.333), Inches(1), "\"Disaster management is about building resilient communities that can withstand any challenge.\"", 14, WHITE, False, PP_ALIGN.CENTER)

# SAVE
output_path = r"C:\Users\techn\OneDrive\Documents\Default Project\Disaster_Management_India.pptx"
prs.save(output_path)
print(f"Presentation saved: {output_path}")
print(f"Total slides: {len(prs.slides)}")
