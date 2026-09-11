import os
import math
from PIL import Image, ImageDraw, ImageFont

def generate_lucidchart_erd():
    # Canvas dimensions: 3400 x 2200 (Fills standard manuscript page edge-to-edge with huge readable text)
    W = 3400
    H = 2200
    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Load large Windows Arial fonts for panelist readability
    font_dir = "C:/Windows/Fonts"
    try:
        font_header = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 40)
        font_attr = ImageFont.truetype(os.path.join(font_dir, "arial.ttf"), 32)
        font_key = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 34)
        font_label = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 26)
    except Exception:
        font_header = ImageFont.load_default()
        font_attr = ImageFont.load_default()
        font_key = ImageFont.load_default()
        font_label = ImageFont.load_default()

    # Styling colors and dimensions
    COLOR_LINE = (35, 45, 55)          # Deep Charcoal outline
    COLOR_TEXT = (25, 33, 40)          # Dark text
    COLOR_BG = (255, 255, 255)         # Pure white card fill
    LINE_WIDTH = 4                     # Thick, bold 4px connector line
    BOX_RADIUS = 16
    HEADER_H = 80
    COL_PK_W = 95
    ROW_H = 54

    # 4-Column Balanced Grid Layout
    col0_x = 70
    col0_w = 560

    col1_x = 1000
    col1_w = 510

    col2_x = 1890
    col2_w = 460

    col3_x = 2720
    col3_w = 490

    # Entity cards definition
    entities = {
        "QUOTATION_REQUESTS": {
            "title": "QUOTATION_REQUESTS",
            "x": col0_x, "y": 490, "w": col0_w,
            "attrs": [
                ("PK", "quotationID"),
                ("FK", "profileID"),
                ("FK", "structureID"),
                ("FK", "materialID"),
                ("", "request_id"),
                ("", "full_name"),
                ("", "email"),
                ("", "phone"),
                ("", "address"),
                ("", "length"),
                ("", "width"),
                ("", "area"),
                ("", "material_cost"),
                ("", "install_cost"),
                ("", "delivery_cost"),
                ("", "total_cost"),
                ("", "status"),
                ("", "created_at"),
            ]
        },
        "PROFILES": {
            "title": "PROFILES",
            "x": col1_x, "y": 120, "w": col1_w,
            "attrs": [
                ("PK", "profileID"),
                ("", "full_name"),
                ("", "email"),
                ("", "phone_number"),
                ("", "role"),
                ("", "status"),
                ("", "created_at"),
            ]
        },
        "MATERIALS": {
            "title": "MATERIALS",
            "x": col2_x, "y": 120, "w": col2_w,
            "attrs": [
                ("PK", "materialID"),
                ("", "name"),
                ("", "price_per_sqm"),
                ("", "color_url"),
                ("", "hex_code"),
                ("", "is_archived"),
                ("", "created_at"),
            ]
        },
        "STRUCTURES": {
            "title": "STRUCTURES",
            "x": col3_x, "y": 120, "w": col3_w,
            "attrs": [
                ("PK", "structureID"),
                ("FK", "materialID"),
                ("", "name"),
                ("", "structure_type"),
                ("", "base_length"),
                ("", "base_width"),
                ("", "model_url"),
                ("", "created_at"),
            ]
        },
        "CONTACT_MESSAGES": {
            "title": "CONTACT_MESSAGES",
            "x": col1_x, "y": 770, "w": col1_w,
            "attrs": [
                ("PK", "messageID"),
                ("FK", "profileID"),
                ("", "full_name"),
                ("", "email"),
                ("", "phone"),
                ("", "subject"),
                ("", "message"),
                ("", "status"),
                ("", "created_at"),
            ]
        },
        "LABOR_RATES": {
            "title": "LABOR_RATES",
            "x": col2_x, "y": 770, "w": col2_w,
            "attrs": [
                ("PK", "rateID"),
                ("", "item_name"),
                ("", "rate_amount"),
                ("", "unit_type"),
                ("", "updated_at"),
            ]
        },
        "CABINET_MATERIALS": {
            "title": "CABINET_MATERIALS",
            "x": col3_x, "y": 770, "w": col3_w,
            "attrs": [
                ("PK", "cabinetID"),
                ("FK", "materialID"),
                ("", "name"),
                ("", "color_url"),
                ("", "hex_code"),
                ("", "created_at"),
            ]
        },
        "GALLERY_ITEMS": {
            "title": "GALLERY_ITEMS",
            "x": col2_x, "y": 1420, "w": col2_w,
            "attrs": [
                ("PK", "itemID"),
                ("FK", "quotationID"),
                ("", "name"),
                ("", "description"),
                ("", "image_url"),
                ("", "created_at"),
            ]
        },
        "APP_SETTINGS": {
            "title": "APP_SETTINGS",
            "x": col3_x, "y": 1420, "w": col3_w,
            "attrs": [
                ("PK", "settingKey"),
                ("FK", "quotationID"),
                ("", "setting_value"),
                ("", "updated_at"),
            ]
        },
    }

    # Render Cards
    for k, ent in entities.items():
        x, y, w = ent["x"], ent["y"], ent["w"]
        num_rows = len(ent["attrs"])
        body_h = num_rows * ROW_H + 16
        total_h = HEADER_H + body_h
        ent["h"] = total_h

        # Rounded outline box
        draw.rounded_rectangle([x, y, x + w, y + total_h], radius=BOX_RADIUS, fill=COLOR_BG, outline=COLOR_LINE, width=LINE_WIDTH)

        # Header horizontal divider
        draw.line([(x, y + HEADER_H), (x + w, y + HEADER_H)], fill=COLOR_LINE, width=LINE_WIDTH)

        # Centered header text
        draw.text((x + w // 2, y + HEADER_H // 2), ent["title"], fill=COLOR_TEXT, font=font_header, anchor="mm")

        # Vertical divider line separating PK/FK column
        draw.line([(x + COL_PK_W, y + HEADER_H), (x + COL_PK_W, y + total_h)], fill=COLOR_LINE, width=LINE_WIDTH)

        # Attributes
        curr_y = y + HEADER_H + 8
        for key_type, name in ent["attrs"]:
            if key_type:
                draw.text((x + COL_PK_W // 2, curr_y + ROW_H // 2), key_type, fill=COLOR_TEXT, font=font_key, anchor="mm")
            draw.text((x + COL_PK_W + 18, curr_y + ROW_H // 2), name, fill=COLOR_TEXT, font=font_attr, anchor="lm")
            curr_y += ROW_H

    # ─────────────────────────────────────────────────────────────
    # STRICT CROW'S FOOT CARDINALITY MARKERS
    # ─────────────────────────────────────────────────────────────

    def draw_one_crossbar(x, y, edge):
        blen = 22      # Crossbar half-length
        dist = 22      # Distance from box edge

        if edge == "left_edge":
            draw.line([(x - dist, y - blen), (x - dist, y + blen)], fill=COLOR_LINE, width=LINE_WIDTH)
        elif edge == "right_edge":
            draw.line([(x + dist, y - blen), (x + dist, y + blen)], fill=COLOR_LINE, width=LINE_WIDTH)
        elif edge == "top_edge":
            draw.line([(x - blen, y - dist), (x + blen, y - dist)], fill=COLOR_LINE, width=LINE_WIDTH)
        elif edge == "bottom_edge":
            draw.line([(x - blen, y + dist), (x + blen, y + dist)], fill=COLOR_LINE, width=LINE_WIDTH)

    def draw_crows_foot(x, y, edge, with_bar=True):
        plen = 28      # Depth of fork along connector line
        spread = 20    # Half-spread of outer prongs at entity boundary
        blen = 22      # Half-length of crossbar

        if edge == "left_edge":
            vx = x - plen
            vy = y
            draw.line([(vx, vy), (x, y - spread)], fill=COLOR_LINE, width=LINE_WIDTH)
            draw.line([(vx, vy), (x, y + spread)], fill=COLOR_LINE, width=LINE_WIDTH)
            if with_bar:
                draw.line([(vx, vy - blen), (vx, vy + blen)], fill=COLOR_LINE, width=LINE_WIDTH)

        elif edge == "right_edge":
            vx = x + plen
            vy = y
            draw.line([(vx, vy), (x, y - spread)], fill=COLOR_LINE, width=LINE_WIDTH)
            draw.line([(vx, vy), (x, y + spread)], fill=COLOR_LINE, width=LINE_WIDTH)
            if with_bar:
                draw.line([(vx, vy - blen), (vx, vy + blen)], fill=COLOR_LINE, width=LINE_WIDTH)

        elif edge == "top_edge":
            vx = x
            vy = y - plen
            draw.line([(vx, vy), (x - spread, y)], fill=COLOR_LINE, width=LINE_WIDTH)
            draw.line([(vx, vy), (x + spread, y)], fill=COLOR_LINE, width=LINE_WIDTH)
            if with_bar:
                draw.line([(vx - blen, vy), (vx + blen, vy)], fill=COLOR_LINE, width=LINE_WIDTH)

        elif edge == "bottom_edge":
            vx = x
            vy = y + plen
            draw.line([(vx, vy), (x - spread, y)], fill=COLOR_LINE, width=LINE_WIDTH)
            draw.line([(vx, vy), (x + spread, y)], fill=COLOR_LINE, width=LINE_WIDTH)
            if with_bar:
                draw.line([(vx - blen, vy), (vx + blen, vy)], fill=COLOR_LINE, width=LINE_WIDTH)

    # Relationship label badge
    def draw_label_badge(cx, cy, text):
        bbox = draw.textbbox((cx, cy), text, font=font_label, anchor="mm")
        pad_x, pad_y = 14, 8
        rect = [bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y]
        draw.rounded_rectangle(rect, radius=8, fill=COLOR_BG, outline=COLOR_LINE, width=LINE_WIDTH)
        draw.text((cx, cy), text, fill=COLOR_TEXT, font=font_label, anchor="mm")

    def draw_rounded_polyline(pts, radius=16):
        if len(pts) < 2:
            return
        if len(pts) == 2:
            draw.line(pts, fill=COLOR_LINE, width=LINE_WIDTH)
            return

        curr_x, curr_y = pts[0]
        for i in range(1, len(pts) - 1):
            prev_x, prev_y = pts[i - 1]
            next_x, next_y = pts[i]
            succ_x, succ_y = pts[i + 1]

            dx1 = 1 if next_x > prev_x else (-1 if next_x < prev_x else 0)
            dy1 = 1 if next_y > prev_y else (-1 if next_y < prev_y else 0)
            dx2 = 1 if succ_x > next_x else (-1 if succ_x < next_x else 0)
            dy2 = 1 if succ_y > next_y else (-1 if succ_y < next_y else 0)

            seg1_len = math.hypot(next_x - curr_x, next_y - curr_y)
            seg2_len = math.hypot(succ_x - next_x, succ_y - next_y)
            r = min(radius, seg1_len / 2, seg2_len / 2)

            arc_start_x = next_x - dx1 * r
            arc_start_y = next_y - dy1 * r
            arc_end_x = next_x + dx2 * r
            arc_end_y = next_y + dy2 * r

            draw.line([(curr_x, curr_y), (arc_start_x, arc_start_y)], fill=COLOR_LINE, width=LINE_WIDTH)

            if dx1 > 0 and dy2 > 0:
                draw.arc([next_x - 2*r, next_y, next_x, next_y + 2*r], 270, 360, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dx1 > 0 and dy2 < 0:
                draw.arc([next_x - 2*r, next_y - 2*r, next_x, next_y], 0, 90, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dx1 < 0 and dy2 > 0:
                draw.arc([next_x, next_y, next_x + 2*r, next_y + 2*r], 180, 270, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dx1 < 0 and dy2 < 0:
                draw.arc([next_x, next_y - 2*r, next_x + 2*r, next_y], 90, 180, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dy1 > 0 and dx2 > 0:
                draw.arc([next_x, next_y - 2*r, next_x + 2*r, next_y], 90, 180, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dy1 > 0 and dx2 < 0:
                draw.arc([next_x - 2*r, next_y - 2*r, next_x, next_y], 0, 90, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dy1 < 0 and dx2 > 0:
                draw.arc([next_x, next_y, next_x + 2*r, next_y + 2*r], 180, 270, fill=COLOR_LINE, width=LINE_WIDTH)
            elif dy1 < 0 and dx2 < 0:
                draw.arc([next_x - 2*r, next_y, next_x, next_y + 2*r], 270, 360, fill=COLOR_LINE, width=LINE_WIDTH)
            else:
                draw.line([(arc_start_x, arc_start_y), (next_x, next_y)], fill=COLOR_LINE, width=LINE_WIDTH)

            curr_x, curr_y = arc_end_x, arc_end_y

        draw.line([(curr_x, curr_y), pts[-1]], fill=COLOR_LINE, width=LINE_WIDTH)

    # ─────────────────────────────────────────────────────────────
    # CONNECTIONS WITH STRICT ERD CARDINALITY
    # ─────────────────────────────────────────────────────────────

    q_bot_y = entities["QUOTATION_REQUESTS"]["y"] + entities["QUOTATION_REQUESTS"]["h"] # 1558
    prof_bot_y = entities["PROFILES"]["y"] + entities["PROFILES"]["h"]                  # 594
    mat_bot_y = entities["MATERIALS"]["y"] + entities["MATERIALS"]["h"]                # 594
    msg_bot_y = entities["CONTACT_MESSAGES"]["y"] + entities["CONTACT_MESSAGES"]["h"]  # 1352
    gal_bot_y = entities["GALLERY_ITEMS"]["y"] + entities["GALLERY_ITEMS"]["h"]        # 1840
    app_bot_y = entities["APP_SETTINGS"]["y"] + entities["APP_SETTINGS"]["h"]          # 1732

    # 1. PROFILES (1) -> (1..N) MATERIALS
    # Parent: PROFILES (Single crossbar '+') -> Child: MATERIALS (Crow's foot with bar)
    draw_rounded_polyline([(col1_x + col1_w, 210), (col2_x, 210)])
    draw_one_crossbar(col1_x + col1_w, 210, "right_edge")
    draw_crows_foot(col2_x, 210, "left_edge", with_bar=True)
    draw_label_badge((col1_x + col1_w + col2_x) // 2, 210, "manages catalog")

    # 2. PROFILES (1) -> (1..N) QUOTATION_REQUESTS
    pts_pq = [(col1_x, 210), (815, 210), (815, 82), (430, 82), (430, 490)]
    draw_rounded_polyline(pts_pq)
    draw_one_crossbar(col1_x, 210, "left_edge")
    draw_crows_foot(430, 490, "top_edge", with_bar=True)
    draw_label_badge((815 + 430) // 2, 82, "submits / reviews")

    # 3. PROFILES (1) -> (1..N) CONTACT_MESSAGES
    prof_cx = col1_x + col1_w // 2
    draw_rounded_polyline([(prof_cx, prof_bot_y), (prof_cx, 770)])
    draw_one_crossbar(prof_cx, prof_bot_y, "bottom_edge")
    draw_crows_foot(prof_cx, 770, "top_edge", with_bar=True)
    draw_label_badge(prof_cx, (prof_bot_y + 770) // 2, "submits / manages")

    # 4. MATERIALS (1) -> (1..N) STRUCTURES
    draw_rounded_polyline([(col2_x + col2_w, 210), (col3_x, 210)])
    draw_one_crossbar(col2_x + col2_w, 210, "right_edge")
    draw_crows_foot(col3_x, 210, "left_edge", with_bar=True)
    draw_label_badge((col2_x + col2_w + col3_x) // 2, 210, "applies to")

    # 5. MATERIALS (N) <-> (N) CABINET_MATERIALS
    # N:N Cardinality (Crow's foot on both ends)
    mat_cx = col2_x + col2_w // 2
    cab_cx = col3_x + col3_w // 2
    pts_mc = [(mat_cx, mat_bot_y), (mat_cx, 680), (cab_cx, 680), (cab_cx, 770)]
    draw_rounded_polyline(pts_mc)
    draw_crows_foot(mat_cx, mat_bot_y, "bottom_edge", with_bar=False)
    draw_crows_foot(cab_cx, 770, "top_edge", with_bar=False)
    draw_label_badge((mat_cx + cab_cx) // 2, 680, "paired for AI score")

    # 6. MATERIALS (1) -> (1..N) QUOTATION_REQUESTS
    pts_mq = [(mat_cx, 120), (mat_cx, 50), (210, 50), (210, 490)]
    draw_rounded_polyline(pts_mq)
    draw_one_crossbar(mat_cx, 120, "top_edge")
    draw_crows_foot(210, 490, "top_edge", with_bar=True)
    draw_label_badge((mat_cx + 210) // 2, 50, "specified in")

    # 7. STRUCTURES (1) -> (1..N) QUOTATION_REQUESTS
    pts_sq = [(col3_x + col3_w, 250), (3310, 250), (3310, 2110), (490, 2110), (490, q_bot_y)]
    draw_rounded_polyline(pts_sq)
    draw_one_crossbar(col3_x + col3_w, 250, "right_edge")
    draw_crows_foot(490, q_bot_y, "bottom_edge", with_bar=True)
    draw_label_badge((3310 + 490) // 2, 2110, "customized in")

    # 8. CONTACT_MESSAGES (1) -> (1..N) QUOTATION_REQUESTS
    draw_rounded_polyline([(col1_x, 920), (col0_x + col0_w, 920)])
    draw_one_crossbar(col1_x, 920, "left_edge")
    draw_crows_foot(col0_x + col0_w, 920, "right_edge", with_bar=True)
    draw_label_badge((col1_x + col0_x + col0_w) // 2, 920, "inquires about")

    # 9. LABOR_RATES (1) -> (1..N) QUOTATION_REQUESTS
    pts_lq = [(col2_x, 950), (1700, 950), (1700, 1385), (col0_x + col0_w, 1385)]
    draw_rounded_polyline(pts_lq)
    draw_one_crossbar(col2_x, 950, "left_edge")
    draw_crows_foot(col0_x + col0_w, 1385, "right_edge", with_bar=True)
    draw_label_badge((1700 + col0_x + col0_w) // 2, 1385, "determines rates")

    # 10. QUOTATION_REQUESTS (1) -> (1..N) GALLERY_ITEMS
    gal_cx = col2_x + col2_w // 2
    pts_qg = [(350, q_bot_y), (350, 1950), (gal_cx, 1950), (gal_cx, gal_bot_y)]
    draw_rounded_polyline(pts_qg)
    draw_one_crossbar(350, q_bot_y, "bottom_edge")
    draw_crows_foot(gal_cx, gal_bot_y, "bottom_edge", with_bar=True)
    draw_label_badge((350 + gal_cx) // 2, 1950, "showcases in")

    # 11. QUOTATION_REQUESTS (1) -> (1..N) APP_SETTINGS
    app_cx = col3_x + col3_w // 2
    pts_qa = [(210, q_bot_y), (210, 2030), (app_cx, 2030), (app_cx, app_bot_y)]
    draw_rounded_polyline(pts_qa)
    draw_one_crossbar(210, q_bot_y, "bottom_edge")
    draw_crows_foot(app_cx, app_bot_y, "bottom_edge", with_bar=True)
    draw_label_badge((210 + app_cx) // 2, 2030, "supplies tax & terms")

    # Save PNG ONLY (No SVG generated)
    out_png = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Figure_3.2_Entity_Relationship_Diagram.png")
    img.save(out_png, "PNG")
    print(f"PNG generated at: {out_png}")

if __name__ == "__main__":
    generate_lucidchart_erd()
