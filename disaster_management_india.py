from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# ─── Color Palette ───
DARK_BG      = RGBColor(0x1A, 0x1A, 0x2E)
ACCENT_RED   = RGBColor(0xE8, 0x3E, 0x3E)
ACCENT_BLUE  = RGBColor(0x2E, 0x86, 0xAB)
ACCENT_GREEN = RGBColor(0x27, 0xAE, 0x60)
ACCENT_ORANGE= RGBColor(0xF3, 0x9C, 0x12)
WHITE        = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY   = RGBColor(0xEC, 0xF0, 0xF1)
DARK_GRAY    = RGBColor(0x2C, 0x3E, 0x50)
MEDIUM_GRAY  = RGBColor(0x7F, 0x8C, 0x8D)
SECTION_BG   = RGBColor(0x0D, 0x0D, 0x1A)
CARD_BG      = RGBColor(0x25, 0x25, 0x40)

def set_slide_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def set_slide_gradient_bg(slide, color1, color2):
    bg = slide.background
    fill = bg.fill
    fill.gradient()
    fill.gradient_stops[0].color.rgb = color1
    fill.gradient_stops[0].position = 0.0
    fill.gradient_stops[1].color.rgb = color2
    fill.gradient_stops[1].position = 1.0

def add_shape_bg(slide, left, top, width, height, color, alpha=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    if alpha is not None:
        from lxml import etree
        nsmap = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
        solidFill = shape.fill._fill
        srgb = solidFill.find('.//a:srgbClr', nsmap)
        if srgb is None:
            srgb = solidFill.find('.//a:schemeClr', nsmap)
        if srgb is not None:
            alpha_elem = etree.SubElement(srgb, '{http://schemas.openxmlformats.org/drawingml/2006/main}alpha')
            alpha_elem.set('val', str(int(alpha * 1000)))
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

def add_textbox(slide, left, top, width, height, text, font_size=18, color=WHITE, bold=False, alignment=PP_ALIGN.LEFT, font_name='Calibri'):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox

def add_multi_text(slide, left, top, width, height, lines, default_size=16, default_color=WHITE, line_spacing=1.2):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, (text, size, color, bold) in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = text
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.bold = bold
        p.font.name = 'Calibri'
        p.space_after = Pt(size * 0.3)
        p.line_spacing = Pt(size * line_spacing)
    return txBox

def add_bullet_list(slide, left, top, width, height, items, font_size=15, color=WHITE, bullet_color=ACCENT_RED, spacing=1.15):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"  {item}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = 'Calibri'
        p.space_after = Pt(6)
        p.level = 0
        pPr = p._pPr
        if pPr is None:
            from lxml import etree
            nsmap = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
            pPr = etree.SubElement(p._p, '{http://schemas.openxmlformats.org/drawingml/2006/main}pPr')
        from lxml import etree
        buChar = etree.SubElement(pPr, '{http://schemas.openxmlformats.org/drawingml/2006/main}buChar')
        buChar.set('char', '\u25CF')
        buClr = etree.SubElement(pPr, '{http://schemas.openxmlformats.org/drawingml/2006/main}buClr')
        srgb = etree.SubElement(buClr, '{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr')
        srgb.set('val', '{:02X}{:02X}{:02X}'.format(bullet_color[0], bullet_color[1], bullet_color[2]))
        buSzPct = etree.SubElement(pPr, '{http://schemas.openxmlformats.org/drawingml/2006/main}buSzPct')
        buSzPct.set('val', '70000')
    return txBox

def add_accent_line(slide, left, top, width, color=ACCENT_RED):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(4))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_number_card(slide, left, top, number, label, color):
    card = add_rounded_rect(slide, left, top, Inches(2.8), Inches(1.8), CARD_BG)
    add_textbox(slide, left, top + Inches(0.2), Inches(2.8), Inches(0.8), number, 36, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, left, top + Inches(1.0), Inches(2.8), Inches(0.6), label, 14, LIGHT_GRAY, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 1 — TITLE SLIDE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), DARK_BG)
add_shape_bg(slide, Inches(0), Inches(5.8), Inches(13.333), Inches(1.7), ACCENT_RED)

# Decorative circles
add_circle(slide, Inches(0.5), Inches(0.5), Inches(2), RGBColor(0x2E, 0x86, 0xAB))
add_circle(slide, Inches(11), Inches(0.3), Inches(1.5), RGBColor(0xE8, 0x3E, 0x3E))
add_circle(slide, Inches(10), Inches(5.5), Inches(2.5), RGBColor(0x27, 0xAE, 0x60))

add_textbox(slide, Inches(1.5), Inches(1.5), Inches(10.5), Inches(1), "DISASTER MANAGEMENT", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4.5), Inches(2.5), Inches(4.3), ACCENT_RED)
add_textbox(slide, Inches(1.5), Inches(2.8), Inches(10.5), Inches(1.2),
            "Overview of Disaster Management\nScenario in India", 32, LIGHT_GRAY, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1.5), Inches(4.3), Inches(10.5), Inches(0.5),
            "Bachelor of Architecture (B.Arch) | Comprehensive Study", 18, MEDIUM_GRAY, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(0), Inches(6.0), Inches(13.333), Inches(1),
            "From Preparedness to Resilience: Understanding India's Disaster Governance Framework",
            16, WHITE, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 2 — TABLE OF CONTENTS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "TABLE OF CONTENTS", 36, WHITE, True, PP_ALIGN.LEFT)

toc_items = [
    ("01", "Introduction to Disaster Management", ACCENT_RED),
    ("02", "Key Definitions & Terminology", ACCENT_BLUE),
    ("03", "Types of Disasters in India", ACCENT_GREEN),
    ("04", "India's Disaster Profile", ACCENT_ORANGE),
    ("05", "Historical Disaster Events in India", ACCENT_RED),
    ("06", "Legal & Institutional Framework", ACCENT_BLUE),
    ("07", "National Disaster Management Authority (NDMA)", ACCENT_GREEN),
    ("08", "Disaster Management Act, 2005", ACCENT_ORANGE),
    ("09", "Four Pillars of Disaster Management", ACCENT_RED),
    ("10", "Prevention & Mitigation Strategies", ACCENT_BLUE),
    ("11", "Preparedness & Early Warning Systems", ACCENT_GREEN),
    ("12", "Response & Rescue Operations", ACCENT_ORANGE),
    ("13", "Rehabilitation & Reconstruction", ACCENT_RED),
    ("14", "Role of Architecture in Disaster Mgmt", ACCENT_BLUE),
    ("15", "Case Studies: Major Disasters in India", ACCENT_GREEN),
    ("16", "International Frameworks & NDMA Guidelines", ACCENT_ORANGE),
    ("17", "Climate Change & Emerging Threats", ACCENT_RED),
    ("18", "Disaster Risk Reduction (DRR)", ACCENT_BLUE),
    ("19", "Challenges in Indian Disaster Management", ACCENT_GREEN),
    ("20", "Future Directions & Conclusion", ACCENT_ORANGE),
]

for i, (num, title, color) in enumerate(toc_items):
    row = i // 2
    col = i % 2
    x = Inches(0.5 + col * 6.5)
    y = Inches(1.6 + row * 0.55)
    c = add_circle(slide, x, y + Inches(0.08), Inches(0.3), color)
    add_textbox(slide, x + Inches(0.05), y + Inches(0.03), Inches(0.3), Inches(0.3), num, 11, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.45), y, Inches(5.5), Inches(0.45), title, 14, WHITE, False)

# ============================================================
# SLIDE 3 — SECTION DIVIDER: INTRODUCTION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), ACCENT_RED)
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0xC0, 0x39, 0x2B))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0xC0, 0x39, 0x2B))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 01", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Introduction to\nDisaster Management", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 4 — WHAT IS DISASTER MANAGEMENT?
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

# Key aspects cards
aspects = [
    ("Planning", "Strategic frameworks\n& policy development", ACCENT_RED),
    ("Organization", "Institutional setup\n& coordination", ACCENT_BLUE),
    ("Response", "Immediate actions\npost-disaster", ACCENT_GREEN),
    ("Recovery", "Long-term restoration\n& rebuilding", ACCENT_ORANGE),
]
for i, (title, desc, color) in enumerate(aspects):
    x = Inches(0.8 + i * 3.1)
    y = Inches(4.3)
    card = add_rounded_rect(slide, x, y, Inches(2.8), Inches(2.5), CARD_BG)
    c = add_circle(slide, x + Inches(0.9), y + Inches(0.2), Inches(0.9), color)
    add_textbox(slide, x + Inches(0.9), y + Inches(0.35), Inches(0.9), Inches(0.5),
                title[0], 24, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(1.3), Inches(2.4), Inches(0.5),
                title, 18, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(1.8), Inches(2.4), Inches(0.7),
                desc, 12, MEDIUM_GRAY, False, PP_ALIGN.CENTER)

# Side box
add_multi_text(slide, Inches(8.5), Inches(1.6), Inches(4.5), Inches(2.5), [
    ("Key Focus Areas", 18, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Minimizing impact of disasters", 14, LIGHT_GRAY, False),
    ("Saving lives & protecting property", 14, LIGHT_GRAY, False),
    ("Ensuring timely response", 14, LIGHT_GRAY, False),
    ("Building resilient communities", 14, LIGHT_GRAY, False),
    ("Sustainable recovery processes", 14, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 5 — KEY DEFINITIONS & TERMINOLOGY
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "KEY DEFINITIONS & TERMINOLOGY", 36, WHITE, True)

definitions = [
    ("Disaster", "A sudden, calamitous event that seriously disrupts the functioning of a community or society and causes human, material, and economic or environmental losses that exceed the community's or society's ability to cope using its own resources.", ACCENT_RED),
    ("Hazard", "A dangerous phenomenon, substance, human activity, or condition that may cause loss of life, injury, health impacts, property damage, etc. Hazards are potential threats.", ACCENT_BLUE),
    ("Vulnerability", "The characteristics and circumstances of a community, system or asset that make it susceptible to the damaging effects of a hazard.", ACCENT_GREEN),
    ("Risk", "The combination of the probability of an event and its negative consequences. Risk = Hazard x Vulnerability x Exposure.", ACCENT_ORANGE),
    ("Mitigation", "The effort to reduce loss of life and property by lessening the impact of disasters.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Resilience", "The ability of a system, community or society exposed to hazards to resist, absorb, accommodate and recover from the effects of a hazard.", RGBColor(0x1A, 0xBC, 0x9C)),
]

for i, (term, definition, color) in enumerate(definitions):
    row = i // 2
    col = i % 2
    x = Inches(0.5 + col * 6.5)
    y = Inches(1.6 + row * 1.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(1.7), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.15), Inches(5.8), Inches(0.4), term, 20, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.6), Inches(5.8), Inches(1.0), definition, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 6 — NEED FOR DISASTER MANAGEMENT
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "WHY IS DISASTER MANAGEMENT NECESSARY?", 34, WHITE, True)

reasons = [
    ("Geographic Diversity", "India's vast geography spanning Himalayas, coastal plains, deserts, and plateaus makes it vulnerable to multiple hazards.", ACCENT_RED),
    ("High Population Density", "Concentrated populations in urban and coastal areas amplify disaster impacts.", ACCENT_BLUE),
    ("Economic Losses", "Disasters cause billions in economic losses annually, affecting GDP growth.", ACCENT_GREEN),
    ("Climate Change Impact", "Changing climate patterns are increasing frequency and intensity of extreme weather events.", ACCENT_ORANGE),
    ("Urbanization", "Rapid unplanned urbanization is increasing vulnerability in cities.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Historical Precedent", "India has experienced repeated devastating disasters, necessitating systematic preparedness.", RGBColor(0x1A, 0xBC, 0x9C)),
]

for i, (title, desc, color) in enumerate(reasons):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.6 + row * 2.8)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.5), CARD_BG)
    c = add_circle(slide, x + Inches(1.4), y + Inches(0.2), Inches(1.0), color)
    add_textbox(slide, x + Inches(1.4), y + Inches(0.35), Inches(1.0), Inches(0.5),
                str(i+1), 22, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.3), y + Inches(1.3), Inches(3.4), Inches(0.4),
                title, 16, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.3), y + Inches(1.7), Inches(3.4), Inches(0.7),
                desc, 12, LIGHT_GRAY, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 7 — SECTION DIVIDER: TYPES OF DISASTERS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), ACCENT_GREEN)
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0x1E, 0x8E, 0x4F))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0x1E, 0x8E, 0x4F))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 02", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Types of Disasters\nin India", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 8 — NATURAL DISASTERS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "NATURAL DISASTERS IN INDIA", 36, WHITE, True)

natural = [
    ("Earthquakes", "India lies on a seismically active zone. The Himalayan belt, northern plains, and peninsular India face varying degrees of seismic risk. India is divided into 4 seismic zones: Zone II to Zone V.", ACCENT_RED, "Major: 2001 Gujarat, 2004 TSunami, 2015 Nepal"),
    ("Floods & Cyclones", "Annual monsoon flooding causes widespread damage. Coastal regions face cyclones from both Arabian Sea and Bay of Bengal. Assam, Bihar, and coastal states are most affected.", ACCENT_BLUE, "Major: 2013 Uttarakhand, 2020 Kerala"),
    ("Landslides", "Himalayan and Western Ghat regions experience frequent landslides due to heavy rainfall, seismic activity, and human interference on slopes.", ACCENT_GREEN, "Major: 2014 J&K, 2023 Himachal"),
    ("Droughts", "Arid and semi-arid regions of Rajasthan, Maharashtra, Karnataka, and Andhra Pradesh face recurring droughts affecting agriculture and water supply.", ACCENT_ORANGE, "Major: 2015 Maharashtra, Rajasthan"),
    ("Tsunamis", "India's 7,517 km coastline is vulnerable to tsunamis, particularly the eastern coast facing the Bay of Bengal.", RGBColor(0x9B, 0x59, 0xB6), "Major: 2004 Indian Ocean Tsunami"),
    ("Heat Waves", "Summer heat waves in central and northern India cause significant mortality, particularly among vulnerable populations.", RGBColor(0xE7, 0x4C, 0x3C), "Major: 2015 Andhra Pradesh, Telangana"),
]

for i, (title, desc, color, example) in enumerate(natural):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 18, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(1.3), desc, 11, LIGHT_GRAY, False)
    add_textbox(slide, x + Inches(0.2), y + Inches(2.0), Inches(3.6), Inches(0.6), example, 10, color, True)

# ============================================================
# SLIDE 9 — MAN-MADE DISASTERS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "MAN-MADE DISASTERS IN INDIA", 36, WHITE, True)

manmade = [
    ("Industrial Accidents", "Bhopal Gas Tragedy (1984) remains the world's worst industrial disaster. Chemical plant failures, factory fires, and nuclear incidents pose ongoing risks.", ACCENT_RED),
    ("Building Collapses", "Rapid, unregulated construction leads to building collapses. Structural failures in old and poorly constructed buildings cause significant casualties.", ACCENT_BLUE),
    ("Transportation Accidents", "Railway accidents, road crashes, and aviation incidents occur regularly due to infrastructure gaps and human error.", ACCENT_GREEN),
    ("Fires", "Urban fires in slums, commercial areas, and industrial zones. Fire safety compliance remains a critical challenge.", ACCENT_ORANGE),
    ("Nuclear/Chemical Hazards", "Proximity of nuclear facilities to population centers and chemical industrial corridors create potential hazard zones.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Infrastructure Failures", "Dam failures, bridge collapses, and power grid failures can cascade into large-scale disasters.", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(manmade):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.6 + row * 2.8)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.5), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(2.5), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.2), Inches(3.6), Inches(0.4), title, 18, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.7), Inches(3.6), Inches(1.7), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 10 — INDIA'S DISASTER PROFILE - STATISTICS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "INDIA'S DISASTER PROFILE — KEY STATISTICS", 34, WHITE, True)

stats = [
    ("58.6%", "of land area is\nearthquake prone", ACCENT_RED),
    ("5,700 km", "of coastline vulnerable\nto cyclones & tsunamis", ACCENT_BLUE),
    ("40 million", "hectares of flood\nprone area", ACCENT_GREEN),
    ("68%", "of land is drought\nprone", ACCENT_ORANGE),
]

for i, (number, label, color) in enumerate(stats):
    x = Inches(0.5 + i * 3.2)
    add_number_card(slide, x, Inches(1.6), number, label, color)

# Additional stats row
stats2 = [
    ("7th", "most disaster-prone\ncountry globally", RGBColor(0x9B, 0x59, 0xB6)),
    ("28 states", "affected by one or\nmore natural hazards", RGBColor(0x1A, 0xBC, 0x9C)),
    ("$10B+", "annual economic\nloss from disasters", RGBColor(0xE7, 0x4C, 0x3C)),
    ("Zone IV-V", "high seismic risk\nfor northern India", RGBColor(0xF3, 0x9C, 0x12)),
]

for i, (number, label, color) in enumerate(stats2):
    x = Inches(0.5 + i * 3.2)
    add_number_card(slide, x, Inches(3.8), number, label, color)

add_multi_text(slide, Inches(0.8), Inches(6.0), Inches(12), Inches(1.2), [
    ("Source: National Disaster Management Authority (NDMA), Government of India | National Institute of Disaster Management (NIDM)", 11, MEDIUM_GRAY, False),
])

# ============================================================
# SLIDE 11 — SECTION DIVIDER: HISTORICAL EVENTS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), ACCENT_BLUE)
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0x1F, 0x6F, 0x8B))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0x1F, 0x6F, 0x8B))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 03", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Historical Disaster Events\nin India", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 12 — MAJOR HISTORICAL DISASTERS TIMELINE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "MAJOR HISTORICAL DISASTERS — TIMELINE", 34, WHITE, True)

events = [
    ("1971", "Bihar Floods", "Over 1,800 deaths; massive displacement in northern Bihar.", ACCENT_RED),
    ("1984", "Bhopal Gas Tragedy", "3,000+ dead; 500,000+ exposed to toxic gas. World's worst industrial disaster.", ACCENT_BLUE),
    ("1999", "Odisha Super Cyclone", "10,000+ deaths; 15 million affected. Devastated coastal Odisha.", ACCENT_GREEN),
    ("2001", "Gujarat Earthquake", "20,000+ deaths; 167,000 injured; $5B damage. Magnitude 7.7.", ACCENT_ORANGE),
    ("2004", "Indian Ocean Tsunami", "12,000+ deaths in India; 100,000+ across Indian Ocean. Magnitude 9.1.", RGBColor(0x9B, 0x59, 0xB6)),
    ("2013", "Uttarakhand Floods", "5,700+ dead; massive infrastructure destruction in Kedarnath.", RGBColor(0x1A, 0xBC, 0x9C)),
    ("2014", "J&K Floods", "277+ dead; 2.5 million affected in Kashmir Valley.", RGBColor(0xE7, 0x4C, 0x3C)),
    ("2015", "Chennai Floods", "500+ deaths; $3B economic loss. Urban flooding case study.", RGBColor(0xF3, 0x9C, 0x12)),
    ("2018", "Kerala Floods", "483 dead; 1 million+ displaced. Worst in 100 years for Kerala.", ACCENT_RED),
    ("2020", "Cyclone Amphan", "129 deaths; $13B damage. Strongest Bay of Bengal cyclone.", ACCENT_BLUE),
]

for i, (year, name, desc, color) in enumerate(events):
    row = i // 5
    col = i % 5
    x = Inches(0.2 + col * 2.6)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(2.4), Inches(2.6), CARD_BG)
    c = add_circle(slide, x + Inches(0.75), y + Inches(0.15), Inches(0.9), color)
    add_textbox(slide, x + Inches(0.75), y + Inches(0.3), Inches(0.9), Inches(0.5), year, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.15), y + Inches(1.2), Inches(2.1), Inches(0.4), name, 13, color, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.15), y + Inches(1.6), Inches(2.1), Inches(0.9), desc, 10, LIGHT_GRAY, False, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 13 — LESSONS FROM HISTORICAL DISASTERS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "LESSONS LEARNED FROM HISTORICAL DISASTERS", 34, WHITE, True)

lessons = [
    ("Early Warning Systems Work", "Cyclone preparedness in Odisha after 1999 reduced deaths from 10,000+ (1999) to less than 100 (2019) during similar intensity cyclones.", ACCENT_RED),
    ("Urban Planning Matters", "Chennai 2015 floods highlighted how unplanned urbanization, encroachment of waterways, and poor drainage amplify flood impacts.", ACCENT_BLUE),
    ("Building Codes Save Lives", "Gujarat 2001 earthquake showed that strict enforcement of seismic building codes reduces casualties significantly.", ACCENT_GREEN),
    ("Community Preparedness is Key", "Kerala 2018 floods demonstrated the critical role of community-based disaster preparedness and local governance.", ACCENT_ORANGE),
    ("Industrial Safety Cannot Be Ignored", "Bhopal 1984 led to comprehensive industrial safety legislation and the Environment Protection Act.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Recovery Must Be Inclusive", "Post-tsunami rehabilitation showed that recovery programs must address the needs of the most vulnerable sections.", RGBColor(0x1A, 0xBC, 0x9C)),
]

for i, (title, desc, color) in enumerate(lessons):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 1.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 16, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(5.8), Inches(1.0), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 14 — SECTION DIVIDER: LEGAL FRAMEWORK
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), ACCENT_ORANGE)
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0xD4, 0x88, 0x0E))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0xD4, 0x88, 0x0E))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 04", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Legal & Institutional\nFramework", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 15 — DISASTER MANAGEMENT ACT 2005
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "DISASTER MANAGEMENT ACT, 2005", 36, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2), [
    ("Overview", 22, ACCENT_ORANGE, True),
    ("", 6, WHITE, False),
    ("The Disaster Management Act was enacted on December 26, 2005, following the devastating 2004 Indian Ocean Tsunami. It provides the legal and institutional framework for disaster management in India.", 14, LIGHT_GRAY, False),
])

provisions = [
    ("NDMA Establishment", "National Disaster Management Authority under the Prime Minister", ACCENT_RED),
    ("SDMA Formation", "State Disaster Management Authorities under Chief Ministers", ACCENT_BLUE),
    ("NDRF Creation", "National Disaster Response Force for specialized response", ACCENT_GREEN),
    ("DM Plans", "Comprehensive plans at National, State, District, and Local levels", ACCENT_ORANGE),
    ("Funding", "National and State Disaster Response Funds", RGBColor(0x9B, 0x59, 0xB6)),
    ("Penalties", "Provisions for penalties for non-compliance", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(provisions):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(3.8 + row * 1.8)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(1.6), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(1.6), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.1), Inches(3.6), Inches(0.35), title, 15, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.5), Inches(3.6), Inches(1.0), desc, 11, LIGHT_GRAY, False)

# Side panel
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(2), [
    ("Key Provisions", 20, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Section 6-10: NDMA Powers & Functions", 12, LIGHT_GRAY, False),
    ("Section 11-15: SDMA Powers & Functions", 12, LIGHT_GRAY, False),
    ("Section 16-21: District Disaster Management Authority", 12, LIGHT_GRAY, False),
    ("Section 22-24: National Disaster Response Force", 12, LIGHT_GRAY, False),
    ("Section 46-47: National & State Disaster Response Fund", 12, LIGHT_GRAY, False),
    ("Section 51-60: Offences & Penalties", 12, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 16 — NDMA STRUCTURE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "INSTITUTIONAL FRAMEWORK — NDMA STRUCTURE", 34, WHITE, True)

# Top level - NDMA
ndma_box = add_rounded_rect(slide, Inches(4.5), Inches(1.5), Inches(4.3), Inches(1.2), ACCENT_RED)
add_textbox(slide, Inches(4.5), Inches(1.6), Inches(4.3), Inches(0.4), "National Disaster Management", 16, WHITE, True, PP_ALIGN.CENTER)
add_textbox(slide, Inches(4.5), Inches(2.0), Inches(4.3), Inches(0.5), "Authority (NDMA)\nChairperson: Prime Minister", 12, LIGHT_GRAY, False, PP_ALIGN.CENTER)

# Second level
second = [
    ("NDRF\nNational Disaster Response Force", ACCENT_BLUE),
    ("NIDM\nNational Institute of Disaster Mgmt", ACCENT_GREEN),
    ("SDMA\nState Disaster Mgmt Authorities", ACCENT_ORANGE),
]
for i, (text, color) in enumerate(second):
    x = Inches(0.8 + i * 4.3)
    box = add_rounded_rect(slide, x, Inches(3.2), Inches(4.0), Inches(1.2), color)
    add_textbox(slide, x, Inches(3.3), Inches(4.0), Inches(1.0), text, 13, WHITE, True, PP_ALIGN.CENTER)

# Third level
third = [
    ("DDMA\nDistrict Disaster Mgmt Authority", RGBColor(0x9B, 0x59, 0xB6)),
    ("NDRF Battalions\n16 Battalions across India", RGBColor(0x1A, 0xBC, 0x9C)),
    ("SDRF\nState Disaster Response Fund", RGBColor(0xE7, 0x4C, 0x3C)),
    ("NDRF\nNational Disaster Response Fund", RGBColor(0xF3, 0x9C, 0x12)),
]
for i, (text, color) in enumerate(third):
    x = Inches(0.3 + i * 3.3)
    box = add_rounded_rect(slide, x, Inches(4.8), Inches(3.0), Inches(1.2), color)
    add_textbox(slide, x, Inches(4.9), Inches(3.0), Inches(1.0), text, 12, WHITE, True, PP_ALIGN.CENTER)

# Bottom level
bottom = [
    ("Village Disaster\nManagement Committees", ACCENT_RED),
    ("Local Emergency\nOperations Centres", ACCENT_BLUE),
    ("Community-Based\nDisaster Management", ACCENT_GREEN),
]
for i, (text, color) in enumerate(bottom):
    x = Inches(0.8 + i * 4.3)
    box = add_rounded_rect(slide, x, Inches(6.3), Inches(4.0), Inches(0.9), color)
    add_textbox(slide, x, Inches(6.35), Inches(4.0), Inches(0.8), text, 11, WHITE, True, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 17 — FOUR PILLARS OF DISASTER MANAGEMENT
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "FOUR PILLARS OF DISASTER MANAGEMENT", 36, WHITE, True)

pillars = [
    ("PREVENTION\n& MITIGATION", "Actions to avoid or reduce the adverse effects of hazards and related disasters. Includes structural and non-structural measures.", ACCENT_RED,
     ["Building code enforcement", "Land-use planning", "Environmental protection", "Infrastructure retrofitting", "Insurance mechanisms"]),
    ("PREPAREDNESS", "Measures taken in advance to ensure effective response. Includes planning, training, and resource mobilization.", ACCENT_BLUE,
     ["Early warning systems", "Emergency planning", "Public awareness campaigns", "Stockpiling supplies", "Mock drills and exercises"]),
    ("RESPONSE", "Actions taken immediately before, during, and after a disaster to save lives, reduce health impacts, and meet basic needs.", ACCENT_GREEN,
     ["Search and rescue operations", "Emergency medical services", "Evacuation management", "Damage assessment", "Relief distribution"]),
    ("RECOVERY", "Measures to restore and improve pre-disaster conditions. Includes short-term and long-term rehabilitation.", ACCENT_ORANGE,
     ["Infrastructure reconstruction", "Livelihood restoration", "Psychosocial support", "Community rebuilding", "Build back better"]),
]

for i, (title, desc, color, points) in enumerate(pillars):
    x = Inches(0.3 + i * 3.3)
    card = add_rounded_rect(slide, x, Inches(1.5), Inches(3.0), Inches(5.8), CARD_BG)
    add_shape_bg(slide, x, Inches(1.5), Inches(3.0), Inches(1.2), color)
    add_textbox(slide, x + Inches(0.1), Inches(1.6), Inches(2.8), Inches(1.0), title, 15, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.15), Inches(2.8), Inches(2.7), Inches(1.2), desc, 10, LIGHT_GRAY, False)
    add_textbox(slide, x + Inches(0.15), Inches(4.1), Inches(2.7), Inches(0.3), "Key Activities:", 11, color, True)
    add_bullet_list(slide, x + Inches(0.15), Inches(4.4), Inches(2.7), Inches(2.8), points, 10, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 18 — SECTION DIVIDER: PREVENTION & MITIGATION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), ACCENT_BLUE)
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0x1F, 0x6F, 0x8B))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0x1F, 0x6F, 0x8B))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 05", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Prevention &\nMitigation Strategies", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 19 — PREVENTION & MITIGATION STRATEGIES
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "PREVENTION & MITIGATION STRATEGIES", 36, WHITE, True)

strategies = [
    ("Structural Measures", "Physical engineering solutions to reduce disaster impact.", ACCENT_RED,
     ["Seismic-resistant building design", "Flood barriers & levees", "Cyclone shelters", "Dam safety programs", "Tsunami sea walls"]),
    ("Non-Structural Measures", "Policy, planning, and institutional approaches.", ACCENT_BLUE,
     ["Building codes & standards", "Land-use zoning regulations", "Environmental impact assessment", "Community awareness programs", "Insurance schemes"]),
    ("Nature-Based Solutions", "Using natural systems for disaster risk reduction.", ACCENT_GREEN,
     ["Mangrove restoration for coastal protection", "Watershed management", "Afforestation & reforestation", "Wetland preservation", "Coral reef conservation"]),
    ("Technological Solutions", "Modern technology for early warning and monitoring.", ACCENT_ORANGE,
     ["Satellite-based monitoring", "IoT sensor networks", "AI-based prediction models", "GIS mapping of hazard zones", "Drone-based surveillance"]),
]

for i, (title, desc, color, points) in enumerate(strategies):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.6), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.1), Inches(5.8), Inches(0.5), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.7), Inches(5.8), Inches(0.4), desc, 11, MEDIUM_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.1), Inches(5.8), Inches(1.5), points, 11, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 20 — SECTION DIVIDER: PREPAREDNESS & EARLY WARNING
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), ACCENT_GREEN)
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0x1E, 0x8E, 0x4F))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0x1E, 0x8E, 0x4F))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 06", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Preparedness &\nEarly Warning Systems", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 21 — EARLY WARNING SYSTEMS IN INDIA
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "EARLY WARNING SYSTEMS IN INDIA", 36, WHITE, True)

systems = [
    ("Cyclone Warning", "IMD provides cyclone warnings through multi-channel communication. India Meteorological Department's cyclone detection radars cover the entire coastline.", ACCENT_RED,
     ["Cyclone warning centers in Chennai, Mumbai, Kolkata", "6-12 hour advance warning system", "Mobile-based alerts to registered users", "Community-level warning dissemination"]),
    ("Flood Forecasting", "Central Water Commission monitors river levels and provides flood forecasts. Telemetric stations monitor real-time water levels.", ACCENT_BLUE,
     ["Upper catchment warning system", "River flow monitoring stations", "Inflow forecasting for reservoirs", "Flood inundation mapping"]),
    ("Earthquake Early Warning", "India is developing earthquake early warning systems for the Himalayan region. Seismic monitoring networks provide real-time data.", ACCENT_GREEN,
     ["Seismic gap analysis", "Strong motion accelerograph network", "Real-time seismic monitoring", "Research on P-wave based warning"]),
    ("Tsunami Warning", "India Tsunami Early Warning Centre (ITEWC) at INCOIS provides tsunami warnings. Established post-2004 tsunami.", ACCENT_ORANGE,
     ["Deep ocean tsunami detection buoys", "Seismic monitoring network", "Coastal tide gauge stations", "National Tsunami Warning Centre"]),
]

for i, (title, desc, color, features) in enumerate(systems):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.6), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.1), Inches(5.8), Inches(0.5), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.7), Inches(5.8), Inches(0.5), desc, 11, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.2), Inches(5.8), Inches(1.4), features, 10, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 22 — PREPAREDNESS MEASURES
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "DISASTER PREPAREDNESS MEASURES", 36, WHITE, True)

measures = [
    ("Emergency Planning", "Development of disaster management plans at national, state, district, and local levels. Includes evacuation plans, resource allocation, and communication protocols.", ACCENT_RED),
    ("Capacity Building", "Training of officials, community volunteers, and first responders. Mock drills and simulation exercises to test preparedness levels.", ACCENT_BLUE),
    ("Resource Stockpiling", "Pre-positioning of emergency supplies including food, water, medicines, tents, and rescue equipment at strategic locations.", ACCENT_GREEN),
    ("Public Awareness", "Community education programs, school curricula integration, media campaigns, and public drills to build disaster preparedness culture.", ACCENT_ORANGE),
    ("Communication Systems", "Multi-modal communication networks including satellite phones, radio, mobile networks, and internet-based alert systems.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Financial Preparedness", "Pre-arranged emergency funds, insurance mechanisms, and contingency budgets for rapid response.", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(measures):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(2.0), desc, 11, LIGHT_GRAY, False)

# ============================================================
# SLIDE 23 — SECTION DIVIDER: RESPONSE & RESCUE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), RGBColor(0x9B, 0x59, 0xB6))
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0x7D, 0x3C, 0x98))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0x7D, 0x3C, 0x98))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 07", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Response &\nRescue Operations", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 24 — RESPONSE & RESCUE OPERATIONS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0x9B, 0x59, 0xB6))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "DISASTER RESPONSE & RESCUE OPERATIONS", 34, WHITE, True)

response = [
    ("National Disaster Response Force (NDRF)", "Specialized force for disaster response. 16 battalions drawn from CISF, BSF, CRPF, ITBP, and SSB. Trained in search, rescue, and medical operations.", ACCENT_RED,
     ["6,000+ personnel trained in disaster response", "Equipment includes life detectors, cutting tools, medical kits", "Conducts community awareness programs", "Participates in international disaster response"]),
    ("Indian Armed Forces", "Military provides critical support during major disasters. Often the first responders in remote and inaccessible areas.", ACCENT_BLUE,
     ["Rapid deployment of troops and equipment", "Air rescue and evacuation operations", "Engineering support for road restoration", "Medical relief through field hospitals"]),
    ("Medical Response", "National and state-level medical response teams. Includes trauma care, disease surveillance, and mental health support.", ACCENT_GREEN,
     ["Emergency medical teams deployment", "Mobile medical units", "Disease outbreak prevention", "Psychosocial support services"]),
    ("Evacuation Management", "Systematic evacuation of affected populations to safe locations. Pre-identified shelters and evacuation routes.", ACCENT_ORANGE,
     ["Pre-mapped evacuation routes", "Temporary relief camps", "Transportation coordination", "Special provisions for vulnerable groups"]),
]

for i, (title, desc, color, points) in enumerate(response):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 16, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(5.8), Inches(0.7), desc, 11, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.3), Inches(5.8), Inches(1.3), points, 10, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 25 — SECTION DIVIDER: REHABILITATION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), RGBColor(0xE7, 0x4C, 0x3C))
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0xC0, 0x39, 0x2B))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0xC0, 0x39, 0x2B))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 08", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Rehabilitation &\nReconstruction", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 26 — REHABILITATION & RECONSTRUCTION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0xE7, 0x4C, 0x3C))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "REHABILITATION & RECONSTRUCTION", 36, WHITE, True)

rehab = [
    ("Short-term Rehabilitation", "Immediate restoration of basic services and living conditions.", ACCENT_RED,
     ["Temporary shelter provision", "Restoration of water supply", "Emergency healthcare services", "Cash transfer programs"]),
    ("Long-term Reconstruction", "Permanent rebuilding of infrastructure and communities.", ACCENT_BLUE,
     ["Housing reconstruction programs", "Infrastructure rebuilding", "Economic rehabilitation", "Social infrastructure restoration"]),
    ("Livelihood Restoration", "Restoring income sources and economic activities.", ACCENT_GREEN,
     ["Agricultural recovery programs", "Small business support", "Skill development programs", "Credit and financial support"]),
    ("Psychosocial Recovery", "Addressing mental health and social well-being.", ACCENT_ORANGE,
     ["Trauma counseling services", "Community support groups", "School rehabilitation", "Cultural heritage restoration"]),
]

for i, (title, desc, color, points) in enumerate(rehab):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(5.8), Inches(0.4), desc, 11, MEDIUM_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.0), Inches(5.8), Inches(1.5), points, 12, LIGHT_GRAY, (color[0], color[1], color[2]))

# "Build Back Better" principle
add_rounded_rect(slide, Inches(2), Inches(6.5), Inches(9.3), Inches(0.8), ACCENT_RED)
add_textbox(slide, Inches(2), Inches(6.55), Inches(9.3), Inches(0.7),
            "\"Build Back Better\" — Reconstruction should incorporate risk reduction measures to reduce future vulnerability",
            14, WHITE, True, PP_ALIGN.CENTER)

# ============================================================
# SLIDE 27 — SECTION DIVIDER: ARCHITECTURE'S ROLE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), RGBColor(0x1A, 0xBC, 0x9C))
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0x15, 0x96, 0x80))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0x15, 0x96, 0x80))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 09", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Role of Architecture\nin Disaster Management", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 28 — ARCHITECTURE & DISASTER MANAGEMENT
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0x1A, 0xBC, 0x9C))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "ARCHITECTURE & DISASTER MANAGEMENT", 34, WHITE, True)

arch_roles = [
    ("Disaster-Resistant Design", "Architects play a crucial role in designing structures that can withstand natural and man-made disasters.", ACCENT_RED,
     ["Seismic-resistant structural systems", "Flood-proof construction techniques", "Wind-resistant building forms", "Fire-safe design principles", "Multi-hazard resistant design"]),
    ("Urban Planning & Zoning", "Strategic urban planning reduces disaster vulnerability through proper land-use planning.", ACCENT_BLUE,
     ["Hazard mapping integration", "Setback regulations from hazard zones", "Open space preservation for evacuation", "Green infrastructure integration", "Transit-oriented development"]),
    ("Post-Disaster Reconstruction", "Architects lead the design and planning of reconstruction efforts.", ACCENT_GREEN,
     ["Participatory design processes", "Cultural sensitivity in rebuilding", "Sustainable material selection", "Community-centered design", "Heritage conservation"]),
    ("Resilient Infrastructure", "Designing infrastructure that can resist and recover from disasters.", ACCENT_ORANGE,
     ["Critical facility protection", "Lifeline infrastructure design", "Modular and adaptable systems", "Redundancy in essential services", "Climate-responsive design"]),
]

for i, (title, desc, color, points) in enumerate(arch_roles):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(5.8), Inches(0.5), desc, 11, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.1), Inches(5.8), Inches(1.5), points, 11, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 29 — SEISMIC DESIGN FOR ARCHITECTS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "SEISMIC DESIGN PRINCIPLES FOR ARCHITECTS", 34, WHITE, True)

seismic = [
    ("IS 1893:2016", "Indian Standard code for earthquake-resistant design. Classifies India into 4 seismic zones (II-V) with increasing seismicity.", ACCENT_RED),
    ("Structural Systems", "Selection of appropriate structural systems: moment-resisting frames, shear walls, braced frames, base isolation.", ACCENT_BLUE),
    ("Plan Configuration", "Symmetric and regular plans reduce torsional effects. Avoids L, T, U shapes without proper separations.", ACCENT_GREEN),
    ("Material Selection", "Use of ductile materials and proper detailing ensures structures can absorb seismic energy.", ACCENT_ORANGE),
    ("Non-Structural Elements", "Proper anchorage of partitions, ceilings, and equipment prevents secondary hazards.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Foundation Design", "Appropriate foundation systems considering soil conditions, liquefaction potential, and seismic forces.", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(seismic):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(2.0), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 30 — CASE STUDIES SECTION DIVIDER
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), RGBColor(0xF3, 0x9C, 0x12))
add_circle(slide, Inches(10.5), Inches(1), Inches(4), RGBColor(0xD4, 0x88, 0x0E))
add_circle(slide, Inches(-0.5), Inches(5), Inches(3), RGBColor(0xD4, 0x88, 0x0E))
add_textbox(slide, Inches(1), Inches(2.5), Inches(11), Inches(1), "SECTION 10", 20, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(3.2), Inches(11), Inches(1.5),
            "Case Studies:\nMajor Disasters in India", 48, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(5.0), Inches(5.3), WHITE)

# ============================================================
# SLIDE 31 — CASE STUDY: 2004 INDIAN OCEAN TSUNAMI
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2004 INDIAN OCEAN TSUNAMI", 34, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, ACCENT_RED, True),
    ("", 6, WHITE, False),
    ("Date: December 26, 2004", 14, LIGHT_GRAY, False),
    ("Magnitude: 9.1 undersea earthquake off Sumatra", 14, LIGHT_GRAY, False),
    ("India: 12,000+ deaths, 5.6 lakh displaced", 14, LIGHT_GRAY, False),
    ("Tsunami waves up to 30 meters hit Indian coast", 14, LIGHT_GRAY, False),
    ("Affected states: Tamil Nadu, Andhra Pradesh, Kerala, Andaman & Nicobar", 14, LIGHT_GRAY, False),
])

# Impact
impact_data = [
    ("12,000+", "Deaths in India", ACCENT_RED),
    ("5.6L", "People Displaced", ACCENT_BLUE),
    ("$1.5B", "Economic Loss", ACCENT_GREEN),
    ("40,000", "Fishermen affected", ACCENT_ORANGE),
]
for i, (num, label, color) in enumerate(impact_data):
    x = Inches(0.5 + i * 3.2)
    add_number_card(slide, x, Inches(4.0), num, label, color)

# Lessons
add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Key Lessons & Response", 20, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Led to creation of ITEWC (Tsunami Warning Centre)", 13, LIGHT_GRAY, False),
    ("Installation of tsunami detection buoys", 13, LIGHT_GRAY, False),
    ("Community-based early warning systems", 13, LIGHT_GRAY, False),
    ("Mangrove restoration as natural barrier", 13, LIGHT_GRAY, False),
    ("Cyclone shelters along coast", 13, LIGHT_GRAY, False),
    ("Coastal regulation zone enforcement", 13, LIGHT_GRAY, False),
])

add_multi_text(slide, Inches(7), Inches(4.0), Inches(5.5), Inches(2.5), [
    ("Architectural Response", 20, ACCENT_GREEN, True),
    ("", 6, WHITE, False),
    ("Redesign of coastal settlements with elevated structures", 13, LIGHT_GRAY, False),
    ("Multi-story cyclone shelters as vertical evacuation", 13, LIGHT_GRAY, False),
    ("Traditional building techniques revisited", 13, LIGHT_GRAY, False),
    ("Housing reconstruction with disaster resilience", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 32 — CASE STUDY: 2001 GUJARAT EARTHQUAKE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2001 GUJARAT EARTHQUAKE", 34, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, ACCENT_BLUE, True),
    ("", 6, WHITE, False),
    ("Date: January 26, 2001 (Republic Day)", 14, LIGHT_GRAY, False),
    ("Magnitude: 7.7 on Richter scale", 14, LIGHT_GRAY, False),
    ("Epicenter: Near Bhuj, Gujarat", 14, LIGHT_GRAY, False),
    ("20,000+ deaths, 167,000 injured", 14, LIGHT_GRAY, False),
    ("$5 billion in damages", 14, LIGHT_GRAY, False),
])

impact2 = [
    ("20,000+", "Deaths", ACCENT_RED),
    ("1.67L", "Injured", ACCENT_BLUE),
    ("$5B", "Damage", ACCENT_GREEN),
    ("3.4L", "Buildings collapsed", ACCENT_ORANGE),
]
for i, (num, label, color) in enumerate(impact2):
    x = Inches(0.5 + i * 3.2)
    add_number_card(slide, x, Inches(4.0), num, label, color)

add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(5), [
    ("Key Architectural Lessons", 20, ACCENT_GREEN, True),
    ("", 6, WHITE, False),
    ("Unreinforced masonry was primary cause of collapse", 13, LIGHT_GRAY, False),
    ("Poor construction quality amplified damage", 13, LIGHT_GRAY, False),
    ("Lack of seismic zone compliance in construction", 13, LIGHT_GRAY, False),
    ("Traditional stone buildings highly vulnerable", 13, LIGHT_GRAY, False),
    ("Post-disaster: Strengthened building codes", 13, LIGHT_GRAY, False),
    ("Introduction of seismic retrofitting programs", 13, LIGHT_GRAY, False),
    ("Comprehensive earthquake risk management plan", 13, LIGHT_GRAY, False),
    ("Focus on rural construction quality improvement", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 33 — CASE STUDY: 2013 UTTARAKHAND FLOODS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2013 UTTARAKHAND FLOODS (KEDARNATH)", 32, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, ACCENT_GREEN, True),
    ("", 6, WHITE, False),
    ("Date: June 13-16, 2013", 14, LIGHT_GRAY, False),
    ("Caused by: Cloudburst + Glacial Lake Outburst", 14, LIGHT_GRAY, False),
    ("5,700+ deaths (official), unofficial estimates higher", 14, LIGHT_GRAY, False),
    ("4,200 villages affected", 14, LIGHT_GRAY, False),
    ("Massive destruction of infrastructure", 14, LIGHT_GRAY, False),
])

impact3 = [
    ("5,700+", "Deaths", ACCENT_RED),
    ("4,200", "Villages Affected", ACCENT_BLUE),
    ("~$2B", "Economic Loss", ACCENT_GREEN),
    ("100K+", "Pilgrims stranded", ACCENT_ORANGE),
]
for i, (num, label, color) in enumerate(impact3):
    x = Inches(0.5 + i * 3.2)
    add_number_card(slide, x, Inches(4.0), num, label, color)

add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(5), [
    ("Architectural & Planning Lessons", 20, ACCENT_ORANGE, True),
    ("", 6, WHITE, False),
    ("Unregulated construction on river banks", 13, LIGHT_GRAY, False),
    ("Encroachment on natural flood paths", 13, LIGHT_GRAY, False),
    ("Weak infrastructure in mountainous terrain", 13, LIGHT_GRAY, False),
    ("Need for hill area building regulations", 13, LIGHT_GRAY, False),
    ("Importance of setback from river banks", 13, LIGHT_GRAY, False),
    ("Slope stability and landslide risk in design", 13, LIGHT_GRAY, False),
    ("Climate-resilient infrastructure needed", 13, LIGHT_GRAY, False),
    ("Traditional water management systems ignored", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 34 — CASE STUDY: 2018 KERALA FLOODS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0x9B, 0x59, 0xB6))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CASE STUDY: 2018 KERALA FLOODS", 36, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(2.5), [
    ("Event Details", 20, RGBColor(0x9B, 0x59, 0xB6), True),
    ("", 6, WHITE, False),
    ("Date: August 2013-2018 monsoon season", 14, LIGHT_GRAY, False),
    ("Worst flooding in Kerala in 100 years", 14, LIGHT_GRAY, False),
    ("483 deaths, 1 million+ displaced", 14, LIGHT_GRAY, False),
    ("22 of 39 districts affected", 14, LIGHT_GRAY, False),
    ("Major dams opened simultaneously", 14, LIGHT_GRAY, False),
])

impact4 = [
    ("483", "Deaths", ACCENT_RED),
    ("10L+", "Displaced", ACCENT_BLUE),
    ("$4.4B", "Damage", ACCENT_GREEN),
    ("33 dams", "Opened", ACCENT_ORANGE),
]
for i, (num, label, color) in enumerate(impact4):
    x = Inches(0.5 + i * 3.2)
    add_number_card(slide, x, Inches(4.0), num, label, color)

add_multi_text(slide, Inches(7), Inches(1.5), Inches(5.5), Inches(5), [
    ("Key Lessons", 20, ACCENT_RED, True),
    ("", 6, WHITE, False),
    ("Sand mining from riverbeds increased flooding", 13, LIGHT_GRAY, False),
    ("Encroachment on flood plains a major factor", 13, LIGHT_GRAY, False),
    ("Community response was exemplary", 13, LIGHT_GRAY, False),
    ("Fishing community played vital rescue role", 13, LIGHT_GRAY, False),
    ("Need for dam water management protocols", 13, LIGHT_GRAY, False),
    ("Urban planning must respect water bodies", 13, LIGHT_GRAY, False),
    ("House-level flood resilience needed", 13, LIGHT_GRAY, False),
    ("Traditional water bodies (pokkali) preservation", 13, LIGHT_GRAY, False),
])

# ============================================================
# SLIDE 35 — INTERNATIONAL FRAMEWORKS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_BLUE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "INTERNATIONAL FRAMEWORKS & NDMA GUIDELINES", 34, WHITE, True)

frameworks = [
    ("Sendai Framework 2015-2030", "Global agreement for disaster risk reduction. Four priorities: understanding risk, strengthening governance, investing in DRR, enhancing preparedness.", ACCENT_RED,
     ["India is a signatory", "7 targets and 4 priorities", "Focus on local level implementation", "Monitoring through UNDRR"]),
    ("SDGs & Disaster Risk", "Sustainable Development Goals integrate disaster risk reduction. Goal 11 specifically addresses making cities inclusive, safe, resilient and sustainable.", ACCENT_BLUE,
     ["Goal 11: Sustainable Cities", "Goal 13: Climate Action", "Integration across all goals", "National voluntary reviews"]),
    ("NDMA Guidelines", "NDMA has issued guidelines covering various hazards and sectors. These provide comprehensive frameworks for disaster management.", ACCENT_GREEN,
     ["National guidelines on each hazard type", "Sector-specific guidelines", "Minimum standards for response", "Capacity building frameworks"]),
    ("Hyogo Framework (2005-2015)", "Predecessor to Sendai Framework. Established the global framework for DRR. India's DM Act was influenced by Hyogo.", ACCENT_ORANGE,
     ["5 priorities for action", "Built-in review mechanism", "Capacity building focus", "India's compliance reporting"]),
]

for i, (title, desc, color, points) in enumerate(frameworks):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 16, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(5.8), Inches(0.7), desc, 11, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.3), Inches(5.8), Inches(1.3), points, 11, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 36 — CLIMATE CHANGE & EMERGING THREATS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0xE7, 0x4C, 0x3C))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CLIMATE CHANGE & EMERGING THREATS", 36, WHITE, True)

climate = [
    ("Rising Sea Levels", "India's 7,517 km coastline faces increasing threats from sea level rise. Coastal cities like Mumbai, Chennai, and Kolkata are highly vulnerable.", ACCENT_RED,
     ["0.3mm annual sea level rise along Indian coast", "Coastal erosion accelerating", "Saltwater intrusion into groundwater", "Small island territories at risk"]),
    ("Extreme Weather Events", "Increasing frequency and intensity of cyclones, heat waves, and extreme rainfall events.", ACCENT_BLUE,
     ["Cyclone intensity increasing in Arabian Sea", "Heat wave frequency rising in central India", "Extreme rainfall events becoming more common", "Urban heat island effects amplified"]),
    ("Water Stress", "Changing monsoon patterns and glacier retreat affecting water availability.", ACCENT_GREEN,
     ["Himalayan glaciers retreating", "Erratic monsoon patterns", "Groundwater depletion", "Inter-state water disputes"]),
    ("Pandemic Preparedness", "COVID-19 highlighted the intersection of public health and disaster management.", ACCENT_ORANGE,
     ["Health infrastructure stress", "Supply chain disruptions", "Economic impacts on vulnerable populations", "Need for pandemic preparedness plans"]),
]

for i, (title, desc, color, points) in enumerate(climate):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.55), Inches(5.8), Inches(0.5), desc, 11, LIGHT_GRAY, False)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(1.1), Inches(5.8), Inches(1.5), points, 11, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 37 — DISASTER RISK REDUCTION (DRR)
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "DISASTER RISK REDUCTION (DRR)", 36, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(12), Inches(1.5), [
    ("Disaster Risk Reduction aims to reduce the damage caused by natural hazards like earthquakes, floods, droughts, and cyclones through an ethic of prevention.", 16, LIGHT_GRAY, False),
])

drr = [
    ("Risk Identification", "Systematic process of determining the nature and extent of risk by analyzing potential hazards and existing conditions of vulnerability.", ACCENT_RED,
     ["Hazard mapping", "Vulnerability assessment", "Exposure analysis", "Capacity and resource inventory", "Historical disaster analysis"]),
    ("Risk Management", "Process of making and implementing decisions that will reduce risk. Involves assessment, prioritization, and implementation of measures.", ACCENT_BLUE,
     ["Risk evaluation", "Prioritization of measures", "Implementation planning", "Monitoring and evaluation", "Adaptive management"]),
    ("Risk Financing", "Mechanisms to finance recovery and reconstruction after disasters, reducing fiscal impact on government.", ACCENT_GREEN,
     ["National Disaster Response Fund", "State Disaster Response Fund", "Insurance mechanisms", "Catastrophe bonds", "Contingency funds"]),
    ("Transfer & Sharing", "Moving risk through insurance, reinsurance, and other financial instruments to reduce individual and community burden.", ACCENT_ORANGE,
     ["Crop insurance schemes", "Weather-based insurance", "Parametric insurance", "International risk pooling", "Community-based mechanisms"]),
]

for i, (title, desc, color, points) in enumerate(drr):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(2.5 + row * 2.5)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(2.3), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 16, WHITE, True)
    add_bullet_list(slide, x + Inches(0.2), y + Inches(0.6), Inches(5.8), Inches(1.5), points, 11, LIGHT_GRAY, (color[0], color[1], color[2]))

# ============================================================
# SLIDE 38 — CHALLENGES IN INDIAN DISASTER MANAGEMENT
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), RGBColor(0xE7, 0x4C, 0x3C))
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CHALLENGES IN INDIAN DISASTER MANAGEMENT", 34, WHITE, True)

challenges = [
    ("Institutional Gaps", "Coordination between multiple agencies remains a challenge. Overlapping jurisdictions and unclear roles hamper effective response.", ACCENT_RED),
    ("Funding Constraints", "Insufficient allocation of disaster management funds. Most funds are spent on response rather than preparedness and mitigation.", ACCENT_BLUE),
    ("Urban Vulnerability", "Rapid, unplanned urbanization has increased disaster risk. Slums, informal settlements, and congested cities are highly vulnerable.", ACCENT_GREEN),
    ("Awareness Deficit", "Low disaster awareness in rural and urban communities. Inadequate public education on preparedness measures.", ACCENT_ORANGE),
    ("Data Gaps", "Lack of comprehensive, updated hazard and vulnerability data. Inadequate risk assessment at local levels.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Climate Change", "Increasing climate variability is creating new and intensifying existing disaster risks. Adaptation capacity remains limited.", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(challenges):
    row = i // 3
    col = i % 3
    x = Inches(0.4 + col * 4.3)
    y = Inches(1.5 + row * 2.9)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(2.0), desc, 12, LIGHT_GRAY, False)

# Additional challenges row
challenges2 = [
    ("Technology Gaps", "Inadequate use of modern technology for early warning, monitoring, and response coordination.", RGBColor(0x1A, 0xBC, 0x9C)),
    ("Governance Issues", "Corruption, bureaucratic delays, and political interference affect disaster management effectiveness.", RGBColor(0xF3, 0x9C, 0x12)),
    ("Capacity Limitations", "Insufficient trained personnel, equipment, and infrastructure for effective disaster response.", RGBColor(0x34, 0x98, 0xDB)),
]

for i, (title, desc, color) in enumerate(challenges2):
    x = Inches(0.4 + i * 4.3)
    y = Inches(4.7)
    card = add_rounded_rect(slide, x, y, Inches(4.0), Inches(2.0), CARD_BG)
    add_shape_bg(slide, x, y, Inches(4.0), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.6), Inches(0.4), title, 16, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(3.6), Inches(1.2), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 39 — BEST PRACTICES & SUCCESS STORIES
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_GREEN)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "BEST PRACTICES & SUCCESS STORIES", 36, WHITE, True)

success = [
    ("Odisha's Cyclone Preparedness", "Deaths from super cyclones reduced from 10,000+ (1999) to less than 100 (2019) through robust early warning, evacuation, and cyclone shelters.", ACCENT_RED),
    ("Chennai Flood Response 2015", "Community-led rescue operations using social media and technology demonstrated the power of citizen engagement in disaster response.", ACCENT_BLUE),
    ("Kerala Community Response 2018", "Fishing communities, voluntary organizations, and local governance created an exemplary community-based disaster response model.", ACCENT_GREEN),
    ("Gujarat Reconstruction", "Post-2001 earthquake reconstruction with focus on seismic-resistant construction created a model for disaster-resilient building.", ACCENT_ORANGE),
    ("Uttarakhand Relief Operations", "Massive multi-agency response including military, NDRF, and civilian volunteers demonstrated coordination in challenging terrain.", RGBColor(0x9B, 0x59, 0xB6)),
    ("NDRF Professionalization", "Development of specialized disaster response force with international training and equipment has enhanced India's response capability.", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(success):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 1.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 16, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(5.8), Inches(1.0), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 40 — FUTURE DIRECTIONS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_ORANGE)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "FUTURE DIRECTIONS & RECOMMENDATIONS", 34, WHITE, True)

future = [
    ("Strengthen Institutional Capacity", "Enhance coordination between agencies, improve funding mechanisms, and build capacity at state and district levels.", ACCENT_RED),
    ("Technology Integration", "Leverage AI, IoT, drones, and satellite technology for improved early warning, monitoring, and response coordination.", ACCENT_BLUE),
    ("Community-Centric Approach", "Strengthen community-based disaster management. Involve local communities in planning, preparedness, and response.", ACCENT_GREEN),
    ("Climate Adaptation", "Integrate disaster risk reduction with climate change adaptation strategies. Develop climate-resilient infrastructure.", ACCENT_ORANGE),
    ("Urban Resilience", "Develop comprehensive urban disaster resilience plans. Integrate disaster risk in urban planning and governance.", RGBColor(0x9B, 0x59, 0xB6)),
    ("Research & Innovation", "Invest in disaster management research. Develop indigenous solutions for India's unique disaster challenges.", RGBColor(0xE7, 0x4C, 0x3C)),
]

for i, (title, desc, color) in enumerate(future):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(1.5 + row * 1.9)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.7), CARD_BG)
    add_shape_bg(slide, x, y, Inches(0.1), Inches(1.7), color)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.15), Inches(5.8), Inches(0.4), title, 18, color, True)
    add_textbox(slide, x + Inches(0.3), y + Inches(0.6), Inches(5.8), Inches(1.0), desc, 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 41 — CONCLUSION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), ACCENT_RED)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "CONCLUSION", 42, WHITE, True)

add_multi_text(slide, Inches(0.8), Inches(1.5), Inches(12), Inches(1.5), [
    ("India faces a wide spectrum of natural and man-made disasters. The country's disaster management framework has evolved significantly since the 2001 Gujarat earthquake and 2004 tsunami, culminating in the Disaster Management Act 2005 and establishment of NDMA.", 15, LIGHT_GRAY, False),
])

conclusions = [
    ("Progress Made", "India has made significant progress in institutional framework, early warning systems, response capabilities, and legal provisions.", ACCENT_RED),
    ("Gaps Remain", "Challenges in implementation, funding, urban vulnerability, community awareness, and climate adaptation need urgent attention.", ACCENT_BLUE),
    ("Role of Architecture", "Architects play a vital role in disaster-resistant design, urban planning, post-disaster reconstruction, and building resilient communities.", ACCENT_GREEN),
    ("Way Forward", "A holistic approach integrating technology, community participation, climate adaptation, and resilient design is essential.", ACCENT_ORANGE),
]

for i, (title, desc, color) in enumerate(conclusions):
    row = i // 2
    col = i % 2
    x = Inches(0.4 + col * 6.5)
    y = Inches(3.3 + row * 2.0)
    card = add_rounded_rect(slide, x, y, Inches(6.2), Inches(1.8), CARD_BG)
    add_shape_bg(slide, x, y, Inches(6.2), Inches(0.5), color)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.08), Inches(5.8), Inches(0.4), title, 18, WHITE, True)
    add_textbox(slide, x + Inches(0.2), y + Inches(0.6), Inches(5.8), Inches(1.1), desc, 13, LIGHT_GRAY, False)

# ============================================================
# SLIDE 42 — REFERENCES
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.3), MEDIUM_GRAY)
add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.8), "REFERENCES & FURTHER READING", 36, WHITE, True)

refs = [
    "Disaster Management Act, 2005 — Government of India",
    "National Disaster Management Authority (NDMA) — ndma.gov.in",
    "National Institute of Disaster Management (NIDM) — nidm.gov.in",
    "India Meteorological Department (IMD) — mausam.imd.gov.in",
    "Central Water Commission — cwc.gov.in",
    "IS 1893:2016 — Criteria for Earthquake Resistant Design of Structures",
    "Sendai Framework for Disaster Risk Reduction 2015-2030",
    "UNDRR Global Assessment Report on Disaster Risk Reduction",
    "National Disaster Response Force (NDRF) — ndrf.gov.in",
    "India Tsunami Early Warning Centre (ITEWC) — incois.gov.in",
    "National Cyclone Risk Mitigation Project (NCRMP)",
    "Post-Disaster Needs Assessment (PDNA) Reports",
]

for i, ref in enumerate(refs):
    row = i // 2
    col = i % 2
    x = Inches(0.5 + col * 6.5)
    y = Inches(1.5 + row * 0.45)
    add_textbox(slide, x, y, Inches(6.2), Inches(0.4),
                f"  {ref}", 12, LIGHT_GRAY, False)

# ============================================================
# SLIDE 43 — THANK YOU
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, SECTION_BG)
add_shape_bg(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), DARK_BG)

# Decorative elements
add_circle(slide, Inches(0.5), Inches(0.5), Inches(2), ACCENT_RED)
add_circle(slide, Inches(11), Inches(0.3), Inches(1.5), ACCENT_BLUE)
add_circle(slide, Inches(10), Inches(5.5), Inches(2.5), ACCENT_GREEN)
add_circle(slide, Inches(1), Inches(5), Inches(1.8), ACCENT_ORANGE)

add_textbox(slide, Inches(1), Inches(2.0), Inches(11), Inches(1.5),
            "THANK YOU", 64, WHITE, True, PP_ALIGN.CENTER)
add_accent_line(slide, Inches(4), Inches(3.5), Inches(5.3), ACCENT_RED)
add_textbox(slide, Inches(1), Inches(3.8), Inches(11), Inches(1),
            "Overview of Disaster Management\nScenario in India", 24, LIGHT_GRAY, False, PP_ALIGN.CENTER)
add_textbox(slide, Inches(1), Inches(5.0), Inches(11), Inches(0.5),
            "Bachelor of Architecture (B.Arch)", 18, MEDIUM_GRAY, False, PP_ALIGN.CENTER)

add_shape_bg(slide, Inches(0), Inches(6.0), Inches(13.333), Inches(1.5), ACCENT_RED)
add_textbox(slide, Inches(0), Inches(6.2), Inches(13.333), Inches(1),
            "\"Disaster management is not just about responding to disasters;\nit's about building resilient communities that can withstand and recover from any challenge.\"",
            14, WHITE, False, PP_ALIGN.CENTER)

# ============================================================
# SAVE
# ============================================================
output_path = r"C:\Users\techn\OneDrive\Documents\Default Project\Disaster_Management_India.pptx"
prs.save(output_path)
print(f"Presentation saved successfully to: {output_path}")
print(f"Total slides: {len(prs.slides)}")
