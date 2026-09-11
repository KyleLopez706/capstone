import os
from PIL import Image, ImageDraw, ImageFont

def create_erd_image():
    # Canvas dimensions - 3200 x 2100 for ultra-high resolution and spacious academic margins
    width = 3200
    height = 2100
    
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Load Windows fonts
    font_dir = "C:/Windows/Fonts"
    try:
        font_title = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 46)
        font_subtitle = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 22)
        font_box_header = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 25)
        font_box_sub = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 17)
        font_attr_bold = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 19)
        font_attr_reg = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 19)
        font_attr_type = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 17)
        font_label = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 17)
        font_footer = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 19)
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_box_header = ImageFont.load_default()
        font_box_sub = ImageFont.load_default()
        font_attr_bold = ImageFont.load_default()
        font_attr_reg = ImageFont.load_default()
        font_attr_type = ImageFont.load_default()
        font_label = ImageFont.load_default()
        font_footer = ImageFont.load_default()

    # Colors
    COLOR_BG = (255, 255, 255)
    COLOR_BORDER = (35, 43, 50)         # Deep Charcoal
    COLOR_HEADER_BG = (246, 248, 250)   # Clean Alabaster White tint
    COLOR_HEADER_TXT = (35, 43, 50)     # Primary Charcoal
    COLOR_PK = (180, 83, 9)             # Amber / Ochre
    COLOR_FK = (2, 132, 199)            # Slate Blue
    COLOR_TEXT = (35, 43, 50)           # Deep Slate
    COLOR_TYPE = (100, 116, 139)        # Muted Slate
    COLOR_LINE = (35, 43, 50)           # Solid dark connectors
    COLOR_LABEL_BG = (255, 255, 255)
    COLOR_LABEL_BORDER = (180, 190, 205)
    COLOR_DIVIDER = (226, 232, 240)

    # Title Header
    draw.text((width // 2, 60), "Figure 3.2: Entity Relationship Diagram of Six Sigmaphil System", fill=COLOR_HEADER_TXT, font=font_title, anchor="mm")
    draw.text((width // 2, 105), "Conceptual & Relational Schema (Crow's Foot Cardinality Notation)", fill=COLOR_TYPE, font=font_subtitle, anchor="mm")
    draw.line([(120, 140), (width - 120, 140)], fill=COLOR_DIVIDER, width=2)

    # Coordinated 3-Column Balanced Layout with generous margins
    # Left column starts at X=290, leaving 290px for clean outer routing
    col1_x = 290
    col2_x = 1310
    col3_x = 2430
    card_w = 480

    entities = {
        "PROFILES": {
            "title": "PROFILES",
            "subtitle": "User & Admin Accounts",
            "x": col1_x, "y": 180, "w": card_w, "h": 360,
            "attrs": [
                ("PK", "id", "UUID (auth.users)"),
                (" ", "email", "VARCHAR(255)"),
                (" ", "full_name", "VARCHAR(150)"),
                (" ", "phone_number", "VARCHAR(30)"),
                (" ", "role", "VARCHAR ('admin' | 'user')"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
        "LABOR_RATES": {
            "title": "LABOR_RATES",
            "subtitle": "Fabrication & Operational Pricing",
            "x": col2_x, "y": 180, "w": card_w, "h": 310,
            "attrs": [
                ("PK", "id", "UUID"),
                (" ", "item_name", "VARCHAR(100)"),
                (" ", "rate_amount", "NUMERIC(10,2)"),
                (" ", "unit_type", "VARCHAR(20) ('sqm' | 'lm')"),
                (" ", "updated_at", "TIMESTAMPTZ"),
            ]
        },
        "APP_SETTINGS": {
            "title": "APP_SETTINGS",
            "subtitle": "System Configuration",
            "x": col3_x, "y": 180, "w": card_w, "h": 260,
            "attrs": [
                ("PK", "key", "VARCHAR(100)"),
                (" ", "value", "JSONB"),
                (" ", "updated_at", "TIMESTAMPTZ"),
            ]
        },
        "STRUCTURES": {
            "title": "STRUCTURES",
            "subtitle": "3D Architectural Models",
            "x": col1_x, "y": 740, "w": card_w, "h": 370,
            "attrs": [
                ("PK", "id", "INT8"),
                (" ", "name", "VARCHAR(150)"),
                (" ", "structure_type", "VARCHAR(50)"),
                (" ", "base_length", "FLOAT8"),
                (" ", "base_width", "FLOAT8"),
                (" ", "model_url", "TEXT (.glb 3D mesh)"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
        "QUOTATION_REQUESTS": {
            "title": "QUOTATION_REQUESTS",
            "subtitle": "Core Inquiries & Generated Quotations",
            "x": 1260, "y": 640, "w": 580, "h": 600,
            "attrs": [
                ("PK", "id", "UUID"),
                (" ", "request_id", "VARCHAR(50)"),
                (" ", "full_name", "VARCHAR(150)"),
                (" ", "email", "VARCHAR(255)"),
                (" ", "phone", "VARCHAR(30)"),
                (" ", "address", "TEXT"),
                ("FK", "product_type", "VARCHAR (STRUCTURES.name)"),
                ("FK", "design", "VARCHAR (MATERIALS.name)"),
                (" ", "length, width, area", "NUMERIC"),
                (" ", "material_cost", "NUMERIC(12,2)"),
                (" ", "install_cost", "NUMERIC(12,2)"),
                (" ", "total_cost", "NUMERIC(12,2)"),
                (" ", "status", "VARCHAR ('pending' | 'approved')"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
        "MATERIALS": {
            "title": "MATERIALS",
            "subtitle": "Granite, Quartz & Stone Catalog",
            "x": col3_x, "y": 640, "w": card_w, "h": 390,
            "attrs": [
                ("PK", "id", "INT8"),
                (" ", "name", "VARCHAR(150)"),
                (" ", "price_per_sqm", "NUMERIC(10,2)"),
                (" ", "color_url", "TEXT (Texture map)"),
                (" ", "hex_code", "VARCHAR(10)"),
                (" ", "is_archived", "BOOLEAN"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
        "CABINET_MATERIALS": {
            "title": "CABINET_MATERIALS",
            "subtitle": "Cabinet Finishes (AI Harmony)",
            "x": col3_x, "y": 1200, "w": card_w, "h": 320,
            "attrs": [
                ("PK", "id", "UUID"),
                (" ", "name", "VARCHAR(150)"),
                (" ", "color_url", "TEXT (Texture swatch)"),
                (" ", "hex_code", "VARCHAR(10) (AI Feature)"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
        "CONTACT_MESSAGES": {
            "title": "CONTACT_MESSAGES",
            "subtitle": "General Public Inquiries",
            "x": col1_x, "y": 1320, "w": card_w, "h": 370,
            "attrs": [
                ("PK", "id", "UUID"),
                (" ", "full_name", "VARCHAR(150)"),
                (" ", "email", "VARCHAR(255)"),
                (" ", "phone", "VARCHAR(30)"),
                (" ", "subject", "VARCHAR(255)"),
                (" ", "message", "TEXT"),
                (" ", "status", "VARCHAR ('unread' | 'replied')"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
        "GALLERY_ITEMS": {
            "title": "GALLERY_ITEMS",
            "subtitle": "Project Portfolio Showcase",
            "x": col2_x, "y": 1420, "w": card_w, "h": 310,
            "attrs": [
                ("PK", "id", "UUID"),
                (" ", "name", "VARCHAR(150)"),
                (" ", "description", "TEXT"),
                (" ", "image_url", "TEXT"),
                (" ", "created_at", "TIMESTAMPTZ"),
            ]
        },
    }

    # Render Cards
    for k, e in entities.items():
        x, y, w, h = e["x"], e["y"], e["w"], e["h"]
        header_h = 66
        
        # Rounded outline box
        draw.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=COLOR_BG, outline=COLOR_BORDER, width=2)
        
        # Header banner
        draw.rounded_rectangle([x, y, x + w, y + header_h], radius=8, fill=COLOR_HEADER_BG)
        draw.rectangle([x, y + header_h - 8, x + w, y + header_h], fill=COLOR_HEADER_BG)
        draw.line([(x, y + header_h), (x + w, y + header_h)], fill=COLOR_BORDER, width=2)
        
        # Header titles
        draw.text((x + 18, y + 12), e["title"], fill=COLOR_HEADER_TXT, font=font_box_header)
        draw.text((x + 18, y + 41), e["subtitle"], fill=COLOR_TYPE, font=font_box_sub)
        
        # Key column divider
        col_pk_w = 48
        draw.line([(x + col_pk_w + 14, y + header_h), (x + col_pk_w + 14, y + h)], fill=COLOR_DIVIDER, width=1)
        
        # Row fields
        row_y = y + header_h + 16
        for pk_fk, name, dtype in e["attrs"]:
            if pk_fk == "PK":
                draw.text((x + 14, row_y), "PK", fill=COLOR_PK, font=font_attr_bold)
            elif pk_fk == "FK":
                draw.text((x + 14, row_y), "FK", fill=COLOR_FK, font=font_attr_bold)
            
            draw.text((x + col_pk_w + 22, row_y), name, fill=COLOR_TEXT, font=font_attr_reg)
            draw.text((x + w - 16, row_y), dtype, fill=COLOR_TYPE, font=font_attr_type, anchor="ra")
            row_y += 35

    # Badge label helper
    def draw_label(cx, cy, text):
        bbox = draw.textbbox((cx, cy), text, font=font_label, anchor="mm")
        pad_x, pad_y = 12, 6
        rect = [bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y]
        draw.rounded_rectangle(rect, radius=6, fill=COLOR_LABEL_BG, outline=COLOR_LABEL_BORDER, width=1)
        draw.text((cx, cy), text, fill=COLOR_HEADER_TXT, font=font_label, anchor="mm")

    # Crow's foot (3 prongs meeting at border x,y)
    def draw_crows_foot(x, y, orientation):
        size = 14
        if orientation == "right":  # ends at (x,y) from left
            draw.line([(x, y), (x - size, y - size)], fill=COLOR_LINE, width=2)
            draw.line([(x, y), (x - size, y + size)], fill=COLOR_LINE, width=2)
            draw.line([(x - size - 4, y - size), (x - size - 4, y + size)], fill=COLOR_LINE, width=2)
        elif orientation == "left": # ends at (x,y) from right
            draw.line([(x, y), (x + size, y - size)], fill=COLOR_LINE, width=2)
            draw.line([(x, y), (x + size, y + size)], fill=COLOR_LINE, width=2)
            draw.line([(x + size + 4, y - size), (x + size + 4, y + size)], fill=COLOR_LINE, width=2)
        elif orientation == "down": # ends at (x,y) from top
            draw.line([(x, y), (x - size, y - size)], fill=COLOR_LINE, width=2)
            draw.line([(x, y), (x + size, y - size)], fill=COLOR_LINE, width=2)
            draw.line([(x - size, y - size - 4), (x + size, y - size - 4)], fill=COLOR_LINE, width=2)
        elif orientation == "up":   # ends at (x,y) from bottom
            draw.line([(x, y), (x - size, y + size)], fill=COLOR_LINE, width=2)
            draw.line([(x, y), (x + size, y + size)], fill=COLOR_LINE, width=2)
            draw.line([(x - size, y + size + 4), (x + size, y + size + 4)], fill=COLOR_LINE, width=2)

    # Mandatory One Marker (||)
    def draw_one_marker(x, y, orientation):
        size = 12
        if orientation == "vertical":
            draw.line([(x - 4, y - size), (x - 4, y + size)], fill=COLOR_LINE, width=2)
            draw.line([(x + 4, y - size), (x + 4, y + size)], fill=COLOR_LINE, width=2)
        elif orientation == "horizontal":
            draw.line([(x - size, y - 4), (x + size, y - 4)], fill=COLOR_LINE, width=2)
            draw.line([(x - size, y + 4), (x + size, y + 4)], fill=COLOR_LINE, width=2)

    # Connectors & Cardinalities:

    # 1. STRUCTURES (1) -> (N) QUOTATION_REQUESTS
    y_str = 880
    draw.line([(col1_x + card_w, y_str), (1260, y_str)], fill=COLOR_LINE, width=2)
    draw_one_marker(col1_x + card_w + 25, y_str, "vertical")
    draw_crows_foot(1260, y_str, "right")
    draw_label(1015, y_str, "1 : N   customized in")

    # 2. MATERIALS (1) -> (N) QUOTATION_REQUESTS
    y_mat = 800
    draw.line([(1840, y_mat), (col3_x, y_mat)], fill=COLOR_LINE, width=2)
    draw_one_marker(col3_x - 25, y_mat, "vertical")
    draw_crows_foot(1840, y_mat, "left")
    draw_label(2135, y_mat, "1 : N   specified in")

    # 3. LABOR_RATES (1) -> (N) QUOTATION_REQUESTS
    x_lab = 1550
    draw.line([(x_lab, 490), (x_lab, 640)], fill=COLOR_LINE, width=2)
    draw_one_marker(x_lab, 515, "horizontal")
    draw_crows_foot(x_lab, 640, "down")
    draw_label(x_lab, 565, "1 : N   determines fabrication rates")

    # 4. CABINET_MATERIALS (M) <-> (N) MATERIALS
    x_cab = col3_x + 240
    draw.line([(x_cab, 1030), (x_cab, 1200)], fill=COLOR_LINE, width=2)
    draw_crows_foot(x_cab, 1030, "up")
    draw_crows_foot(x_cab, 1200, "down")
    draw_label(x_cab, 1115, "M : N   paired for AI score")

    # 5. PROFILES (1) -> (N) QUOTATION_REQUESTS
    draw.line([(col1_x + card_w, 360), (1015, 360)], fill=COLOR_LINE, width=2)
    draw.line([(1015, 360), (1015, 750)], fill=COLOR_LINE, width=2)
    draw.line([(1015, 750), (1260, 750)], fill=COLOR_LINE, width=2)
    draw_one_marker(col1_x + card_w + 25, 360, "vertical")
    draw_crows_foot(1260, 750, "right")
    draw_label(1015, 540, "1 : N   submits / reviews")

    # 6. PROFILES (1) -> (N) CONTACT_MESSAGES
    # Clean outer channel at X=140 with 140px margins to border
    x_bypass = 140
    draw.line([(col1_x, 460), (x_bypass, 460)], fill=COLOR_LINE, width=2)
    draw.line([(x_bypass, 460), (x_bypass, 1480)], fill=COLOR_LINE, width=2)
    draw.line([(x_bypass, 1480), (col1_x, 1480)], fill=COLOR_LINE, width=2)
    draw_one_marker(col1_x - 25, 460, "vertical")
    draw_crows_foot(col1_x, 1480, "right")
    draw_label(x_bypass, 970, "1 : N   submits / manages")

    # 7. PROFILES (1) -> (N) STRUCTURES
    x_ps = col1_x + 240
    draw.line([(x_ps, 540), (x_ps, 740)], fill=COLOR_LINE, width=2)
    draw_one_marker(x_ps, 565, "horizontal")
    draw_crows_foot(x_ps, 740, "down")
    draw_label(x_ps, 640, "1 : N   manages 3D")

    # 8. APP_SETTINGS (1) -> (N) QUOTATION_REQUESTS
    draw.line([(col3_x + 100, 440), (col3_x + 100, 540)], fill=COLOR_LINE, width=2)
    draw.line([(col3_x + 100, 540), (1740, 540)], fill=COLOR_LINE, width=2)
    draw.line([(1740, 540), (1740, 640)], fill=COLOR_LINE, width=2)
    draw_one_marker(col3_x + 100, 465, "horizontal")
    draw_crows_foot(1740, 640, "down")
    draw_label(2135, 540, "1 : N   supplies tax & terms")

    # 9. PROFILES / ADMIN (1) -> (N) GALLERY_ITEMS
    x_gal = 1550
    draw.line([(x_gal, 1240), (x_gal, 1420)], fill=COLOR_LINE, width=2)
    draw_one_marker(x_gal, 1265, "horizontal")
    draw_crows_foot(x_gal, 1420, "down")
    draw_label(x_gal, 1330, "1 : N   publishes showcase")

    # Bottom Legend
    leg_y = 1980
    draw.line([(120, leg_y - 25), (width - 120, leg_y - 25)], fill=COLOR_DIVIDER, width=1)
    draw.text((width // 2, leg_y + 10), "Crow's Foot Legend:   || Mandatory One (Parent)       >| / o{ Optional / Mandatory Many (Child)       PK: Primary Key       FK: Foreign Key", fill=COLOR_TYPE, font=font_footer, anchor="mm")

    # Save PNG
    out_png = "d:/Capstone/Figure_3.2_Entity_Relationship_Diagram.png"
    img.save(out_png, "PNG", dpi=(300, 300))
    print(f"PNG Generated: {out_png}")

    # Generate matching SVG file
    create_erd_svg("d:/Capstone/Figure_3.2_Entity_Relationship_Diagram.svg", width, height, entities)

def create_erd_svg(out_svg, width, height, entities):
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%" style="background-color:#ffffff; font-family: Segoe UI, Arial, sans-serif;">',
        '<!-- Defs for Markers and Styles -->',
        '<defs>',
        '  <filter id="shadow" x="-2%" y="-2%" width="104%" height="104%">',
        '    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.04"/>',
        '  </filter>',
        '</defs>',
        '<!-- Header -->',
        f'<text x="{width//2}" y="65" text-anchor="middle" font-size="44" font-weight="bold" fill="#232B32">Figure 3.2: Entity Relationship Diagram of Six Sigmaphil System</text>',
        f'<text x="{width//2}" y="110" text-anchor="middle" font-size="22" fill="#64748B">Conceptual &amp; Relational Schema (Crow\'s Foot Cardinality Notation)</text>',
        f'<line x1="120" y1="140" x2="{width - 120}" y2="140" stroke="#E2E8F0" stroke-width="2"/>',
    ]

    # Entities
    for k, e in entities.items():
        x, y, w, h = e["x"], e["y"], e["w"], e["h"]
        header_h = 66
        svg_lines.append(f'<!-- {e["title"]} -->')
        svg_lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#FFFFFF" stroke="#232B32" stroke-width="2" filter="url(#shadow)"/>')
        svg_lines.append(f'<path d="M {x} {y+8} Q {x} {y} {x+8} {y} L {x+w-8} {y} Q {x+w} {y} {x+w} {y+8} L {x+w} {y+header_h} L {x} {y+header_h} Z" fill="#F6F8FA" stroke="#232B32" stroke-width="2"/>')
        svg_lines.append(f'<text x="{x+18}" y="{y+32}" font-size="24" font-weight="bold" fill="#232B32">{e["title"]}</text>')
        svg_lines.append(f'<text x="{x+18}" y="{y+54}" font-size="16" fill="#64748B">{e["subtitle"]}</text>')
        
        # PK col line
        col_pk_w = 48
        svg_lines.append(f'<line x1="{x+col_pk_w+14}" y1="{y+header_h}" x2="{x+col_pk_w+14}" y2="{y+h}" stroke="#E2E8F0" stroke-width="1"/>')
        
        row_y = y + header_h + 30
        for pk_fk, name, dtype in e["attrs"]:
            color_key = "#B45309" if pk_fk == "PK" else ("#0284C7" if pk_fk == "FK" else "#64748B")
            if pk_fk.strip():
                svg_lines.append(f'<text x="{x+16}" y="{row_y}" font-size="18" font-weight="bold" fill="{color_key}">{pk_fk}</text>')
            svg_lines.append(f'<text x="{x+col_pk_w+22}" y="{row_y}" font-size="18" fill="#232B32">{name}</text>')
            svg_lines.append(f'<text x="{x+w-16}" y="{row_y}" text-anchor="end" font-size="16" fill="#64748B">{dtype}</text>')
            row_y += 35

    # Helper label function for SVG
    def svg_label(cx, cy, text, w_est=230):
        h_est = 34
        x0 = cx - w_est // 2
        y0 = cy - h_est // 2
        return (f'<rect x="{x0}" y="{y0}" width="{w_est}" height="{h_est}" rx="6" fill="#FFFFFF" stroke="#B4BECB" stroke-width="1"/>'
                f'<text x="{cx}" y="{cy+6}" text-anchor="middle" font-size="16" font-weight="bold" fill="#232B32">{text}</text>')

    # Connectors
    # 1. STRUCTURES -> QUOTATION_REQUESTS
    svg_lines.append('<line x1="770" y1="880" x2="1260" y2="880" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(1015, 880, "1 : N   customized in", 220))

    # 2. MATERIALS -> QUOTATION_REQUESTS
    svg_lines.append('<line x1="1840" y1="800" x2="2430" y2="800" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(2135, 800, "1 : N   specified in", 210))

    # 3. LABOR_RATES -> QUOTATION_REQUESTS
    svg_lines.append('<line x1="1550" y1="490" x2="1550" y2="640" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(1550, 565, "1 : N   determines fabrication rates", 290))

    # 4. CABINET_MATERIALS <-> MATERIALS
    svg_lines.append('<line x1="2670" y1="1030" x2="2670" y2="1200" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(2670, 1115, "M : N   paired for AI score", 240))

    # 5. PROFILES -> QUOTATION_REQUESTS
    svg_lines.append('<path d="M 770 360 L 1015 360 L 1015 750 L 1260 750" fill="none" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(1015, 540, "1 : N   submits / reviews", 220))

    # 6. PROFILES -> CONTACT_MESSAGES
    svg_lines.append('<path d="M 290 460 L 140 460 L 140 1480 L 290 1480" fill="none" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(140, 970, "1 : N   submits / manages", 220))

    # 7. PROFILES -> STRUCTURES
    svg_lines.append('<line x1="530" y1="540" x2="530" y2="740" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(530, 640, "1 : N   manages 3D", 190))

    # 8. APP_SETTINGS -> QUOTATION_REQUESTS
    svg_lines.append('<path d="M 2530 440 L 2530 540 L 1740 540 L 1740 640" fill="none" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(2135, 540, "1 : N   supplies tax &amp; terms", 240))

    # 9. PROFILES -> GALLERY_ITEMS
    svg_lines.append('<line x1="1550" y1="1240" x2="1550" y2="1420" stroke="#232B32" stroke-width="2"/>')
    svg_lines.append(svg_label(1550, 1330, "1 : N   publishes showcase", 230))

    # Footer Legend
    leg_y = 1980
    svg_lines.append(f'<line x1="120" y1="{leg_y-25}" x2="{width - 120}" y2="{leg_y-25}" stroke="#E2E8F0" stroke-width="1"/>')
    svg_lines.append(f'<text x="{width//2}" y="{leg_y+15}" text-anchor="middle" font-size="18" fill="#64748B">Crow\'s Foot Legend:   || Mandatory One (Parent)       &gt;| / o{{ Optional / Mandatory Many (Child)       PK: Primary Key       FK: Foreign Key</text>')
    svg_lines.append('</svg>')

    with open(out_svg, 'w', encoding='utf-8') as f:
        f.write('\n'.join(svg_lines))
    print(f"SVG Generated: {out_svg}")

if __name__ == "__main__":
    create_erd_image()
