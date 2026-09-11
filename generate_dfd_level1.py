import os
import math
from PIL import Image, ImageDraw, ImageFont

def generate_dfd_level1():
    # Canvas dimensions: 2600 x 2500 (Compact portrait/square aspect ratio, fills entire page)
    W = 2600
    H = 2500
    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Windows Arial Fonts - Massive & bold for thesis panel readability
    font_dir = "C:/Windows/Fonts"
    try:
        font_entity = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 50)
        font_proc_num = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 50)
        font_proc_name = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 36)
        font_ds_title = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 42)
        font_flow = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 30)
        font_flow_sub = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 24)
    except Exception:
        font_entity = ImageFont.load_default()
        font_proc_num = ImageFont.load_default()
        font_proc_name = ImageFont.load_default()
        font_ds_title = ImageFont.load_default()
        font_flow = ImageFont.load_default()
        font_flow_sub = ImageFont.load_default()

    # Colors
    COLOR_LINE = (30, 42, 54)          # Deep slate line (#1E2A36)
    COLOR_TEXT = (15, 23, 32)          # Sharp dark text (#0F1720)
    COLOR_BG = (255, 255, 255)         # Pure white
    LINE_WIDTH = 3.5                   # 3.5px crisp line
    RADIUS = 16

    # ─────────────────────────────────────────────────────────────
    # 1. PROCESSES (Center Column: X = 1010 to 1590, Width = 580)
    # ─────────────────────────────────────────────────────────────
    PROC_W = 580
    PROC_H = 210
    PROC_X = (W - PROC_W) // 2  # 1010
    HEADER_H = 65

    processes = {
        "1.0": {"num": "1.0", "lines": ["Configure Granite", "Product"], "y": 70},
        "2.0": {"num": "2.0", "lines": ["Manage Inquiry"], "y": 590},
        "3.0": {"num": "3.0", "lines": ["Generate", "Quotation"], "y": 1110},
        "4.0": {"num": "4.0", "lines": ["Predict Quality", "Score"], "y": 1630},
        "5.0": {"num": "5.0", "lines": ["Admin Summary", "Reports"], "y": 2150}
    }

    def draw_process_box(p):
        x = PROC_X
        y = p["y"]
        w = PROC_W
        h = PROC_H
        draw.rounded_rectangle([x, y, x + w, y + h], radius=RADIUS, fill=COLOR_BG, outline=COLOR_LINE, width=int(LINE_WIDTH))
        draw.line([(x, y + HEADER_H), (x + w, y + HEADER_H)], fill=COLOR_LINE, width=int(LINE_WIDTH))
        draw.text((x + w // 2, y + HEADER_H // 2), p["num"], fill=COLOR_TEXT, font=font_proc_num, anchor="mm")
        
        lines = p["lines"]
        line_h = 44
        total_h = len(lines) * line_h
        start_y = (y + HEADER_H) + (h - HEADER_H) // 2 - total_h // 2 + line_h // 2
        for i, l in enumerate(lines):
            draw.text((x + w // 2, start_y + i * line_h), l, fill=COLOR_TEXT, font=font_proc_name, anchor="mm")

    for p in processes.values():
        draw_process_box(p)

    # ─────────────────────────────────────────────────────────────
    # 2. EXTERNAL ENTITIES & DATA STORE (Filling Canvas Width)
    # ─────────────────────────────────────────────────────────────

    # User (Top-Left)
    user_x, user_y, user_w, user_h = 240, 70, 360, 230
    draw.rounded_rectangle([user_x, user_y, user_x + user_w, user_y + user_h], radius=RADIUS, fill=COLOR_BG, outline=COLOR_LINE, width=int(LINE_WIDTH))
    draw.text((user_x + user_w // 2, user_y + user_h // 2), "User", fill=COLOR_TEXT, font=font_entity, anchor="mm")

    # Admin/Staff (Middle-Right)
    admin_x, admin_y, admin_w, admin_h = 2060, 590, 380, 230
    draw.rounded_rectangle([admin_x, admin_y, admin_x + admin_w, admin_y + admin_h], radius=RADIUS, fill=COLOR_BG, outline=COLOR_LINE, width=int(LINE_WIDTH))
    draw.text((admin_x + admin_w // 2, admin_y + admin_h // 2), "Admin/Staff", fill=COLOR_TEXT, font=font_entity, anchor="mm")

    # SixSigmaPhil Database (Data Store, Middle-Left)
    db_x, db_y, db_w, db_h = 180, 860, 520, 200
    stripe_w = 52
    draw.rounded_rectangle([db_x, db_y, db_x + db_w, db_y + db_h], radius=RADIUS, fill=COLOR_BG, outline=COLOR_LINE, width=int(LINE_WIDTH))
    draw.line([(db_x + stripe_w, db_y), (db_x + stripe_w, db_y + db_h)], fill=COLOR_LINE, width=int(LINE_WIDTH))
    draw.text((db_x + stripe_w + (db_w - stripe_w) // 2, db_y + db_h // 2 - 24), "SixSigmaPhil", fill=COLOR_TEXT, font=font_ds_title, anchor="mm")
    draw.text((db_x + stripe_w + (db_w - stripe_w) // 2, db_y + db_h // 2 + 24), "Database", fill=COLOR_TEXT, font=font_ds_title, anchor="mm")

    # COLOURlovers Dataset (External Dataset, Lower-Right)
    ds_x, ds_y, ds_w, ds_h = 1960, 1630, 520, 200
    ds_stripe_w = 52
    draw.rounded_rectangle([ds_x, ds_y, ds_x + ds_w, ds_y + ds_h], radius=RADIUS, fill=COLOR_BG, outline=COLOR_LINE, width=int(LINE_WIDTH))
    draw.line([(ds_x + ds_stripe_w, ds_y), (ds_x + ds_stripe_w, ds_y + ds_h)], fill=COLOR_LINE, width=int(LINE_WIDTH))
    draw.text((ds_x + ds_stripe_w + (ds_w - ds_stripe_w) // 2, ds_y + ds_h // 2 - 24), "COLOURlovers", fill=COLOR_TEXT, font=font_ds_title, anchor="mm")
    draw.text((ds_x + ds_stripe_w + (ds_w - ds_stripe_w) // 2, ds_y + ds_h // 2 + 26), "(External Dataset)", fill=COLOR_TEXT, font=font_flow_sub, anchor="mm")

    # ─────────────────────────────────────────────────────────────
    # 3. DRAWING HELPERS: ARROWS & LABELS
    # ─────────────────────────────────────────────────────────────

    def draw_arrow_head(x, y, direction):
        alen = 18
        awid = 10
        if direction == "right":
            pts = [(x, y), (x - alen, y - awid), (x - alen, y + awid)]
        elif direction == "left":
            pts = [(x, y), (x + alen, y - awid), (x + alen, y + awid)]
        elif direction == "up":
            pts = [(x, y), (x - awid, y + alen), (x + awid, y + alen)]
        elif direction == "down":
            pts = [(x, y), (x - awid, y - alen), (x + awid, y - alen)]
        draw.polygon(pts, fill=COLOR_LINE)

    def draw_polyline(pts, arrow_dir=None):
        if len(pts) < 2:
            return
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i+1]], fill=COLOR_LINE, width=int(LINE_WIDTH))
        if arrow_dir:
            draw_arrow_head(pts[-1][0], pts[-1][1], arrow_dir)

    def draw_flow_label(cx, cy, lines, font=font_flow, anchor="mm"):
        line_h = 38
        total_h = len(lines) * line_h
        max_w = 0
        for l in lines:
            bbox = draw.textbbox((cx, cy), l, font=font, anchor=anchor)
            w = bbox[2] - bbox[0]
            if w > max_w:
                max_w = w

        pad_x, pad_y = 14, 8
        if anchor == "mm":
            rect = [cx - max_w // 2 - pad_x, cy - total_h // 2 - pad_y,
                    cx + max_w // 2 + pad_x, cy + total_h // 2 + pad_y]
            start_y = cy - (len(lines) - 1) * (line_h / 2)
            draw.rectangle(rect, fill=COLOR_BG)
            for idx, line in enumerate(lines):
                draw.text((cx, start_y + idx * line_h), line, fill=COLOR_TEXT, font=font, anchor="mm")
        elif anchor == "lm":
            rect = [cx - pad_x, cy - total_h // 2 - pad_y,
                    cx + max_w + pad_x, cy + total_h // 2 + pad_y]
            start_y = cy - (len(lines) - 1) * (line_h / 2)
            draw.rectangle(rect, fill=COLOR_BG)
            for idx, line in enumerate(lines):
                draw.text((cx, start_y + idx * line_h), line, fill=COLOR_TEXT, font=font, anchor="lm")

    # ─────────────────────────────────────────────────────────────
    # 4. DATA FLOWS (Orthogonal Connectors & Enlarged Labels)
    # ─────────────────────────────────────────────────────────────

    # 1. User -> Process 1.0 (Top flow)
    # Product Design, Project Type and Dimensions
    draw_polyline([(user_x + user_w, 130), (PROC_X, 130)], "right")
    draw_flow_label(805, 85, ["Product Design,", "Project Type and Dimensions"])

    # 2. Process 1.0 -> User (Bottom flow)
    # 3D Granite Preview
    draw_polyline([(PROC_X, 220), (user_x + user_w, 220)], "left")
    draw_flow_label(805, 180, ["3D Granite Preview"])

    # 3. Process 1.0 -> Database
    # Store Product Configuration
    p1_bot_x = PROC_X + 290  # 1300
    p1_bot_y = processes["1.0"]["y"] + PROC_H # 280
    draw_polyline([(p1_bot_x, p1_bot_y), (p1_bot_x, 400), (460, 400), (460, db_y)], "down")
    draw_flow_label(880, 400, ["Store Product Configuration"])

    # 4. Admin/Staff -> Process 1.0
    # Product Data and Pricing
    draw_polyline([(admin_x + 190, admin_y), (admin_x + 190, 215), (PROC_X + PROC_W, 215)], "left")
    draw_flow_label(1920, 215, ["Product Data and Pricing"])

    # 5. Process 4.0 -> Process 1.0
    # Design Quality Score and Recommendations
    p4_bot_y = processes["4.0"]["y"] + PROC_H # 1840
    pts_ai = [
        (PROC_X + 290, p4_bot_y),
        (PROC_X + 290, 1920),
        (2530, 1920),
        (2530, 130),
        (PROC_X + PROC_W, 130)
    ]
    draw_polyline(pts_ai, "left")
    draw_flow_label(2060, 130, ["Design Quality Score and Recommendations"])

    # 6. User -> Process 2.0
    # Inquiry Details
    draw_polyline([(user_x + 180, user_y + user_h), (user_x + 180, 650), (PROC_X, 650)], "right")
    draw_flow_label(715, 650, ["Inquiry Details"])

    # 7. Process 2.0 -> Database
    # Store Inquiry Data
    draw_polyline([(PROC_X, 740), (540, 740), (540, db_y)], "down")
    draw_flow_label(775, 740, ["Store Inquiry Data"])

    # 8. Process 2.0 -> Admin/Staff
    # Inquiry Notification
    draw_polyline([(PROC_X + PROC_W, 650), (admin_x, 650)], "right")
    draw_flow_label(1825, 650, ["Inquiry Notification"])

    # 9. Admin/Staff -> Process 2.0
    # Inquiry Response
    draw_polyline([(admin_x, 740), (PROC_X + PROC_W, 740)], "left")
    draw_flow_label(1825, 740, ["Inquiry Response"])

    # 10. Database -> Process 3.0 (Pricing Data)
    # Pricing Data and Additional Cost
    pts_pricing = [
        (db_x + db_w, 910),
        (1840, 910),
        (1840, 1170),
        (PROC_X + PROC_W, 1170)
    ]
    draw_polyline(pts_pricing, "left")
    draw_flow_label(1270, 910, ["Pricing Data and Additional Cost"])

    # 11. Database -> Process 3.0 (Product & Inquiry Data)
    # Product and Inquiry Data
    p3_top_y = processes["3.0"]["y"] # 1110
    draw_polyline([(db_x + db_w, 990), (1200, 990), (1200, p3_top_y)], "down")
    draw_flow_label(950, 990, ["Product and Inquiry Data"])

    # 12. Process 3.0 -> Database
    # Store Quotation Record
    p3_bot_y = processes["3.0"]["y"] + PROC_H # 1320
    draw_polyline([(PROC_X + 160, p3_bot_y), (PROC_X + 160, 1390), (600, 1390), (600, db_y + db_h)], "up")
    draw_flow_label(805, 1390, ["Store Quotation Record"])

    # 13. Process 3.0 -> User
    # Quotation and Estimated Price (Placed inside the open corridor, 100% zero clipping)
    line_x = 90
    pts_quote_user = [
        (PROC_X, 1220),
        (line_x, 1220),
        (line_x, 185),
        (user_x, 185)
    ]
    draw_polyline(pts_quote_user, "right")
    draw_flow_label(line_x + 20, 700, ["Quotation and", "Estimated Price"], anchor="lm")

    # 14. Database -> Process 4.0
    # Granite Designs & Colour Model Reference
    pts_db_p4 = [
        (db_x + 230, db_y + db_h),
        (db_x + 230, 1730),
        (PROC_X, 1730)
    ]
    draw_polyline(pts_db_p4, "right")
    draw_flow_label(645, 1730, ["Granite Designs & Colour Model Reference"])

    # 15. COLOURlovers (External Dataset) -> Process 4.0
    # Color Combinations Data
    draw_polyline([(ds_x, 1730), (PROC_X + PROC_W, 1730)], "left")
    draw_flow_label(1820, 1730, ["Color Combinations", "Data"])

    # 16. Database -> Process 5.0
    # Recorded Quotation Request
    pts_db_p5 = [
        (db_x + 130, db_y + db_h),
        (db_x + 130, 2250),
        (PROC_X, 2250)
    ]
    draw_polyline(pts_db_p5, "right")
    draw_flow_label(605, 2250, [
        "Recorded Quotation Request",
        "(Popular product designs and Popular project types)"
    ], font=font_flow_sub)

    # 17. Process 5.0 -> Admin/Staff
    # Summary Reports & Analytics
    pts_reports = [
        (PROC_X + PROC_W, 2250),
        (1640, 2250),
        (1640, 780),
        (admin_x, 780)
    ]
    draw_polyline(pts_reports, "right")
    draw_flow_label(1640, 1450, ["Summary Reports", "& Analytics"])

    # Save PNG
    out_png = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Figure_3.3_DFD_Level_1.png")
    img.save(out_png, "PNG")
    print(f"PNG generated at: {out_png}")

    # Generate Vector SVG
    generate_dfd_level1_svg(W, H, processes, PROC_W, PROC_H, PROC_X, HEADER_H,
                            user_x, user_y, user_w, user_h,
                            admin_x, admin_y, admin_w, admin_h,
                            db_x, db_y, db_w, db_h, stripe_w,
                            ds_x, ds_y, ds_w, ds_h, ds_stripe_w, line_x)

def generate_dfd_level1_svg(W, H, processes, PROC_W, PROC_H, PROC_X, HEADER_H,
                            user_x, user_y, user_w, user_h,
                            admin_x, admin_y, admin_w, admin_h,
                            db_x, db_y, db_w, db_h, stripe_w,
                            ds_x, ds_y, ds_w, ds_h, ds_stripe_w, line_x):
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" height="100%" style="background-color:#ffffff; font-family: Arial, sans-serif;">',
        '<defs>',
        '  <marker id="arr-r" viewBox="0 0 18 12" refX="18" refY="6" markerWidth="11" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 18 6 L 0 12 z" fill="#1E2A36"/></marker>',
        '  <marker id="arr-l" viewBox="0 0 18 12" refX="0" refY="6" markerWidth="11" markerHeight="8" orient="auto"><path d="M 18 0 L 0 6 L 18 12 z" fill="#1E2A36"/></marker>',
        '  <marker id="arr-u" viewBox="0 0 12 18" refX="6" refY="0" markerWidth="8" markerHeight="11" orient="auto"><path d="M 0 18 L 6 0 L 12 18 z" fill="#1E2A36"/></marker>',
        '  <marker id="arr-d" viewBox="0 0 12 18" refX="6" refY="18" markerWidth="8" markerHeight="11" orient="auto"><path d="M 0 0 L 6 18 L 12 0 z" fill="#1E2A36"/></marker>',
        '</defs>',
        '<style>',
        '  .p-box  { fill: #FFFFFF; stroke: #1E2A36; stroke-width: 3.5px; rx: 16px; }',
        '  .p-num  { font-family: Arial, sans-serif; font-size: 50px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .p-name { font-family: Arial, sans-serif; font-size: 36px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .e-box  { fill: #FFFFFF; stroke: #1E2A36; stroke-width: 3.5px; rx: 16px; }',
        '  .e-name { font-family: Arial, sans-serif; font-size: 50px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .ds-name{ font-family: Arial, sans-serif; font-size: 42px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .ds-sub { font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .f-lbl  { font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .f-lbl-l{ font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; fill: #0F1720; text-anchor: start; }',
        '  .f-sub  { font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; fill: #0F1720; text-anchor: middle; }',
        '  .c-line { stroke: #1E2A36; stroke-width: 3.5px; fill: none; stroke-linecap: round; stroke-linejoin: round; }',
        '</style>'
    ]

    # Process boxes
    for p in processes.values():
        x, y = PROC_X, p["y"]
        svg.append(f'<rect x="{x}" y="{y}" width="{PROC_W}" height="{PROC_H}" class="p-box"/>')
        svg.append(f'<line x1="{x}" y1="{y+HEADER_H}" x2="{x+PROC_W}" y2="{y+HEADER_H}" stroke="#1E2A36" stroke-width="3.5"/>')
        svg.append(f'<text x="{x+PROC_W//2}" y="{y+HEADER_H//2+17}" class="p-num">{p["num"]}</text>')

        lines = p["lines"]
        line_h = 44
        total_h = len(lines) * line_h
        start_y = (y + HEADER_H) + (PROC_H - HEADER_H) // 2 - total_h // 2 + line_h // 2 + 12
        for i, l in enumerate(lines):
            svg.append(f'<text x="{x+PROC_W//2}" y="{start_y+i*line_h}" class="p-name">{l}</text>')

    # User
    svg.append(f'<rect x="{user_x}" y="{user_y}" width="{user_w}" height="{user_h}" class="e-box"/>')
    svg.append(f'<text x="{user_x+user_w//2}" y="{user_y+user_h//2+17}" class="e-name">User</text>')

    # Admin/Staff
    svg.append(f'<rect x="{admin_x}" y="{admin_y}" width="{admin_w}" height="{admin_h}" class="e-box"/>')
    svg.append(f'<text x="{admin_x+admin_w//2}" y="{admin_y+admin_h//2+17}" class="e-name">Admin/Staff</text>')

    # Database
    svg.append(f'<rect x="{db_x}" y="{db_y}" width="{db_w}" height="{db_h}" class="e-box"/>')
    svg.append(f'<line x1="{db_x+stripe_w}" y1="{db_y}" x2="{db_x+stripe_w}" y2="{db_y+db_h}" stroke="#1E2A36" stroke-width="3.5"/>')
    svg.append(f'<text x="{db_x+stripe_w+(db_w-stripe_w)//2}" y="{db_y+db_h//2-10}" class="ds-name">SixSigmaPhil</text>')
    svg.append(f'<text x="{db_x+stripe_w+(db_w-stripe_w)//2}" y="{db_y+db_h//2+38}" class="ds-name">Database</text>')

    # COLOURlovers Dataset
    svg.append(f'<rect x="{ds_x}" y="{ds_y}" width="{ds_w}" height="{ds_h}" class="e-box"/>')
    svg.append(f'<line x1="{ds_x+ds_stripe_w}" y1="{ds_y}" x2="{ds_x+ds_stripe_w}" y2="{ds_y+ds_h}" stroke="#1E2A36" stroke-width="3.5"/>')
    svg.append(f'<text x="{ds_x+ds_stripe_w+(ds_w-ds_stripe_w)//2}" y="{ds_y+ds_h//2-10}" class="ds-name">COLOURlovers</text>')
    svg.append(f'<text x="{ds_x+ds_stripe_w+(ds_w-ds_stripe_w)//2}" y="{ds_y+ds_h//2+38}" class="ds-sub">(External Dataset)</text>')

    # Helper for SVG Label
    def svg_lbl(cx, cy, lines, w_est=380, is_sub=False, is_left=False):
        line_h = 38
        total_h = len(lines) * line_h
        if is_left:
            res = [f'<rect x="{cx-8}" y="{cy-total_h//2-6}" width="{w_est}" height="{total_h+12}" fill="#FFFFFF"/>']
            start_y = cy - (len(lines) - 1) * (line_h / 2) + 10
            for i, l in enumerate(lines):
                res.append(f'<text x="{cx}" y="{start_y+i*line_h}" class="f-lbl-l">{l}</text>')
        else:
            res = [f'<rect x="{cx-w_est//2}" y="{cy-total_h//2-6}" width="{w_est}" height="{total_h+12}" fill="#FFFFFF"/>']
            start_y = cy - (len(lines) - 1) * (line_h / 2) + 10
            cls_name = "f-sub" if is_sub else "f-lbl"
            for i, l in enumerate(lines):
                res.append(f'<text x="{cx}" y="{start_y+i*line_h}" class="{cls_name}">{l}</text>')
        return '\n'.join(res)

    # 1. User -> Process 1.0
    svg.append(f'<line x1="{user_x+user_w}" y1="130" x2="{PROC_X}" y2="130" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(805, 85, ["Product Design,", "Project Type and Dimensions"], 460))

    # 2. Process 1.0 -> User
    svg.append(f'<line x1="{PROC_X}" y1="220" x2="{user_x+user_w}" y2="220" class="c-line" marker-end="url(#arr-l)"/>')
    svg.append(svg_lbl(805, 180, ["3D Granite Preview"], 310))

    # 3. Process 1.0 -> Database
    p1_bot_x = PROC_X + 290
    p1_bot_y = processes["1.0"]["y"] + PROC_H
    svg.append(f'<path d="M {p1_bot_x} {p1_bot_y} L {p1_bot_x} 400 L 460 400 L 460 {db_y}" class="c-line" marker-end="url(#arr-d)"/>')
    svg.append(svg_lbl(880, 400, ["Store Product Configuration"], 420))

    # 4. Admin/Staff -> Process 1.0
    svg.append(f'<path d="M {admin_x+190} {admin_y} L {admin_x+190} 215 L {PROC_X+PROC_W} 215" class="c-line" marker-end="url(#arr-l)"/>')
    svg.append(svg_lbl(1920, 215, ["Product Data and Pricing"], 380))

    # 5. Process 4.0 -> Process 1.0
    p4_bot_y = processes["4.0"]["y"] + PROC_H
    svg.append(f'<path d="M {PROC_X+290} {p4_bot_y} L {PROC_X+290} 1920 L 2530 1920 L 2530 130 L {PROC_X+PROC_W} 130" class="c-line" marker-end="url(#arr-l)"/>')
    svg.append(svg_lbl(2060, 130, ["Design Quality Score and Recommendations"], 650))

    # 6. User -> Process 2.0
    svg.append(f'<path d="M {user_x+180} {user_y+user_h} L {user_x+180} 650 L {PROC_X} 650" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(715, 650, ["Inquiry Details"], 250))

    # 7. Process 2.0 -> Database
    svg.append(f'<path d="M {PROC_X} 740 L 540 740 L 540 {db_y}" class="c-line" marker-end="url(#arr-d)"/>')
    svg.append(svg_lbl(775, 740, ["Store Inquiry Data"], 300))

    # 8. Process 2.0 -> Admin/Staff
    svg.append(f'<line x1="{PROC_X+PROC_W}" y1="650" x2="{admin_x}" y2="650" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(1825, 650, ["Inquiry Notification"], 310))

    # 9. Admin/Staff -> Process 2.0
    svg.append(f'<line x1="{admin_x}" y1="740" x2="{PROC_X+PROC_W}" y2="740" class="c-line" marker-end="url(#arr-l)"/>')
    svg.append(svg_lbl(1825, 740, ["Inquiry Response"], 290))

    # 10. Database -> Process 3.0 (Pricing)
    svg.append(f'<path d="M {db_x+db_w} 910 L 1840 910 L 1840 1170 L {PROC_X+PROC_W} 1170" class="c-line" marker-end="url(#arr-l)"/>')
    svg.append(svg_lbl(1270, 910, ["Pricing Data and Additional Cost"], 480))

    # 11. Database -> Process 3.0 (Product & Inquiry)
    p3_top_y = processes["3.0"]["y"]
    svg.append(f'<path d="M {db_x+db_w} 990 L 1200 990 L 1200 {p3_top_y}" class="c-line" marker-end="url(#arr-d)"/>')
    svg.append(svg_lbl(950, 990, ["Product and Inquiry Data"], 390))

    # 12. Process 3.0 -> Database
    p3_bot_y = processes["3.0"]["y"] + PROC_H
    svg.append(f'<path d="M {PROC_X+160} {p3_bot_y} L {PROC_X+160} 1390 L 600 1390 L 600 {db_y+db_h}" class="c-line" marker-end="url(#arr-u)"/>')
    svg.append(svg_lbl(805, 1390, ["Store Quotation Record"], 370))

    # 13. Process 3.0 -> User
    svg.append(f'<path d="M {PROC_X} 1220 L {line_x} 1220 L {line_x} 185 L {user_x} 185" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(line_x + 20, 700, ["Quotation and", "Estimated Price"], 250, is_left=True))

    # 14. Database -> Process 4.0
    svg.append(f'<path d="M {db_x+230} {db_y+db_h} L {db_x+230} 1730 L {PROC_X} 1730" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(645, 1730, ["Granite Designs & Colour Model Reference"], 620))

    # 15. COLOURlovers -> Process 4.0
    svg.append(f'<line x1="{ds_x}" y1="1730" x2="{PROC_X+PROC_W}" y2="1730" class="c-line" marker-end="url(#arr-l)"/>')
    svg.append(svg_lbl(1820, 1730, ["Color Combinations", "Data"], 290))

    # 16. Database -> Process 5.0
    svg.append(f'<path d="M {db_x+130} {db_y+db_h} L {db_x+130} 2250 L {PROC_X} 2250" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(605, 2250, ["Recorded Quotation Request", "(Popular product designs and Popular project types)"], 680, is_sub=True))

    # 17. Process 5.0 -> Admin/Staff
    svg.append(f'<path d="M {PROC_X+PROC_W} 2250 L 1640 2250 L 1640 780 L {admin_x} 780" class="c-line" marker-end="url(#arr-r)"/>')
    svg.append(svg_lbl(1640, 1450, ["Summary Reports", "& Analytics"], 290))

    svg.append('</svg>')

    out_svg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Figure_3.3_DFD_Level_1.svg")
    with open(out_svg, 'w', encoding='utf-8') as f:
        f.write('\n'.join(svg))
    print(f"SVG generated at: {out_svg}")

if __name__ == "__main__":
    generate_dfd_level1()
