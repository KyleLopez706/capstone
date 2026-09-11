import os
import math
from PIL import Image, ImageDraw, ImageFont

def generate_context_diagram():
    # Canvas dimensions: 2400 x 1350 (Ultra crisp 16:9 publication ready)
    W = 2400
    H = 1350
    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Windows Arial fonts - Significantly enlarged for high-readability printing
    font_dir = "C:/Windows/Fonts"
    try:
        font_entity = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 44)
        font_pnum = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 52)
        font_pname = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 33)
        font_flow = ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 28)
    except Exception:
        font_entity = ImageFont.load_default()
        font_pnum = ImageFont.load_default()
        font_pname = ImageFont.load_default()
        font_flow = ImageFont.load_default()

    # Lucidchart DFD style colors
    COLOR_LINE = (30, 41, 59)          # Crisp Slate Charcoal (#1E293B)
    COLOR_TEXT = (15, 23, 42)          # Deep Charcoal Text (#0F172A)
    COLOR_BG = (255, 255, 255)         # Pure White Fill
    LINE_WIDTH = 3                     # Bold 3px line

    # 1. PROCESS 0 (Center) - Compacted shape to leave more space for data flows
    proc_w, proc_h = 490, 460
    proc_x = (W - proc_w) // 2  # 955
    proc_y = 130
    header_h = 65

    # Process 0 outer box
    draw.rectangle([proc_x, proc_y, proc_x + proc_w, proc_y + proc_h], fill=COLOR_BG, outline=COLOR_LINE, width=LINE_WIDTH)
    # Process 0 header dividing line
    draw.line([(proc_x, proc_y + header_h), (proc_x + proc_w, proc_y + header_h)], fill=COLOR_LINE, width=LINE_WIDTH)

    # Process "0" text
    draw.text((proc_x + proc_w // 2, proc_y + header_h // 2), "0", fill=COLOR_TEXT, font=font_pnum, anchor="mm")

    # Process title lines
    proc_lines = [
        "Interactive 3D Granite",
        "Configurator with",
        "Design Quality",
        "Prediction and",
        "Quotation",
        "Management System"
    ]
    line_spacing = 46
    start_y = proc_y + header_h + 42
    for idx, line in enumerate(proc_lines):
        draw.text((proc_x + proc_w // 2, start_y + idx * line_spacing), line, fill=COLOR_TEXT, font=font_pname, anchor="mm")

    # 2. EXTERNAL ENTITIES - Scaled smaller for clean proportions
    # Left: User
    ent_w, ent_h = 290, 200
    user_x = 110
    user_y = 255
    draw.rectangle([user_x, user_y, user_x + ent_w, user_y + ent_h], fill=COLOR_BG, outline=COLOR_LINE, width=LINE_WIDTH)
    draw.text((user_x + ent_w // 2, user_y + ent_h // 2), "User", fill=COLOR_TEXT, font=font_entity, anchor="mm")

    # Right: Admin/Staff
    admin_w, admin_h = 310, 200
    admin_x = W - admin_w - 110  # 1980
    admin_y = 255
    draw.rectangle([admin_x, admin_y, admin_x + admin_w, admin_y + admin_h], fill=COLOR_BG, outline=COLOR_LINE, width=LINE_WIDTH)
    draw.text((admin_x + admin_w // 2, admin_y + admin_h // 2), "Admin/Staff", fill=COLOR_TEXT, font=font_entity, anchor="mm")

    # Bottom: COLOURlovers Dataset
    ds_w, ds_h = 360, 150
    ds_x = (W - ds_w) // 2  # 1020
    ds_y = 1000
    draw.rectangle([ds_x, ds_y, ds_x + ds_w, ds_y + ds_h], fill=COLOR_BG, outline=COLOR_LINE, width=LINE_WIDTH)
    draw.text((ds_x + ds_w // 2, ds_y + ds_h // 2 - 24), "COLOURlovers", fill=COLOR_TEXT, font=ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 38), anchor="mm")
    draw.text((ds_x + ds_w // 2, ds_y + ds_h // 2 + 24), "Dataset", fill=COLOR_TEXT, font=ImageFont.truetype(os.path.join(font_dir, "arialbd.ttf"), 38), anchor="mm")

    # 3. HELPER: DRAW ARROW WITH CRISP TRIANGULAR HEAD
    def draw_arrow(x1, y1, x2, y2):
        draw.line([(x1, y1), (x2, y2)], fill=COLOR_LINE, width=LINE_WIDTH)

        arrow_len = 18
        arrow_width = 10
        dx = x2 - x1
        dy = y2 - y1
        angle = math.atan2(dy, dx)

        p1 = (x2, y2)
        p2 = (x2 - arrow_len * math.cos(angle) + arrow_width * math.sin(angle),
              y2 - arrow_len * math.sin(angle) - arrow_width * math.cos(angle))
        p3 = (x2 - arrow_len * math.cos(angle) - arrow_width * math.sin(angle),
              y2 - arrow_len * math.sin(angle) + arrow_width * math.cos(angle))

        draw.polygon([p1, p2, p3], fill=COLOR_LINE)

    # 4. HELPER: DRAW MULTI-LINE TEXT ABOVE HORIZONTAL ARROW
    def draw_above_flow_label(cx, baseline_y, lines):
        line_h = 36
        total_text_h = len(lines) * line_h
        start_y = baseline_y - total_text_h + line_h // 2
        for idx, line in enumerate(lines):
            draw.text((cx, start_y + idx * line_h), line, fill=COLOR_TEXT, font=font_flow, anchor="mm")

    # 5. HELPER: DRAW MULTI-LINE TEXT WITH WHITE BACKDROP FOR VERTICAL ARROW
    def draw_backdrop_flow_label(cx, cy, lines):
        line_h = 36
        total_text_h = len(lines) * line_h
        max_w = 0
        for l in lines:
            bbox = draw.textbbox((cx, cy), l, font=font_flow, anchor="mm")
            w = bbox[2] - bbox[0]
            if w > max_w:
                max_w = w

        pad_x, pad_y = 18, 10
        rect = [cx - max_w // 2 - pad_x, cy - total_text_h // 2 - pad_y,
                cx + max_w // 2 + pad_x, cy + total_text_h // 2 + pad_y]
        draw.rectangle(rect, fill=COLOR_BG)

        start_y = cy - (len(lines) - 1) * (line_h / 2)
        for idx, line in enumerate(lines):
            draw.text((cx, start_y + idx * line_h), line, fill=COLOR_TEXT, font=font_flow, anchor="mm")

    # ─────────────────────────────────────────────────────────────
    # DATA FLOWS (ARROWS & LABELS) - ENLARGED TYPOGRAPHY
    # ─────────────────────────────────────────────────────────────

    # Flow Arrow Y-Coordinates
    y_flow_top = 305
    y_flow_bot = 445

    user_right_x = user_x + ent_w   # 400
    admin_left_x = admin_x          # 1980
    proc_left_x = proc_x            # 955
    proc_right_x = proc_x + proc_w  # 1445

    center_left_flow_x = (user_right_x + proc_left_x) // 2    # 677
    center_right_flow_x = (proc_right_x + admin_left_x) // 2  # 1712

    # A. User -> System (Top Left Flow)
    draw_arrow(user_right_x, y_flow_top, proc_left_x, y_flow_top)
    draw_above_flow_label(
        center_left_flow_x,
        y_flow_top - 14,
        [
            "Product Design, Project Type,",
            "Custom Dimensions, and",
            "Quotation Request"
        ]
    )

    # B. System -> User (Bottom Left Flow)
    draw_arrow(proc_left_x, y_flow_bot, user_right_x, y_flow_bot)
    draw_above_flow_label(
        center_left_flow_x,
        y_flow_bot - 14,
        [
            "3D Interactive Preview,",
            "AI Quality / Color Score, and",
            "Itemized Price Quotation"
        ]
    )

    # C. Admin/Staff -> System (Top Right Flow)
    draw_arrow(admin_left_x, y_flow_top, proc_right_x, y_flow_top)
    draw_above_flow_label(
        center_right_flow_x,
        y_flow_top - 14,
        [
            "Material Catalog & Rates,",
            "System Settings, and",
            "Inquiry Responses"
        ]
    )

    # D. System -> Admin/Staff (Bottom Right Flow)
    draw_arrow(proc_right_x, y_flow_bot, admin_left_x, y_flow_bot)
    draw_above_flow_label(
        center_right_flow_x,
        y_flow_bot - 14,
        [
            "Customer Quotations,",
            "Inquiry Messages, and",
            "Summary Reports"
        ]
    )

    # E. COLOURlovers Dataset -> System (Bottom Vertical Flow)
    x_center = W // 2  # 1200
    draw_arrow(x_center, ds_y, x_center, proc_y + proc_h)
    draw_backdrop_flow_label(
        x_center,
        (ds_y + proc_y + proc_h) // 2,
        [
            "Color Combinations &",
            "Quality Training Data"
        ]
    )

    # Save PNG
    out_png = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Figure_3.1_Context_Diagram.png")
    img.save(out_png, "PNG")
    print(f"PNG generated at: {out_png}")

    # Generate Vector SVG
    generate_context_svg(W, H, proc_x, proc_y, proc_w, proc_h, header_h,
                         user_x, user_y, ent_w, ent_h, admin_x, admin_y, admin_w, admin_h,
                         ds_x, ds_y, ds_w, ds_h, y_flow_top, y_flow_bot, x_center,
                         center_left_flow_x, center_right_flow_x)

def generate_context_svg(W, H, proc_x, proc_y, proc_w, proc_h, header_h,
                         user_x, user_y, ent_w, ent_h, admin_x, admin_y, admin_w, admin_h,
                         ds_x, ds_y, ds_w, ds_h, y_flow_top, y_flow_bot, x_center,
                         center_left_flow_x, center_right_flow_x):
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" height="100%" style="background-color:#ffffff; font-family: Arial, sans-serif;">',
        '<defs>',
        '  <marker id="arrow-right" viewBox="0 0 18 12" refX="18" refY="6" markerWidth="11" markerHeight="8" orient="auto-start-reverse">',
        '    <path d="M 0 0 L 18 6 L 0 12 z" fill="#1E293B"/>',
        '  </marker>',
        '  <marker id="arrow-left" viewBox="0 0 18 12" refX="0" refY="6" markerWidth="11" markerHeight="8" orient="auto">',
        '    <path d="M 18 0 L 0 6 L 18 12 z" fill="#1E293B"/>',
        '  </marker>',
        '  <marker id="arrow-up" viewBox="0 0 12 18" refX="6" refY="0" markerWidth="8" markerHeight="11" orient="auto">',
        '    <path d="M 0 18 L 6 0 L 12 18 z" fill="#1E293B"/>',
        '  </marker>',
        '</defs>',
        '<style>',
        '  .ent-box  { fill: #FFFFFF; stroke: #1E293B; stroke-width: 3px; }',
        '  .ent-text { font-family: Arial, sans-serif; font-size: 44px; font-weight: bold; fill: #0F172A; text-anchor: middle; }',
        '  .ds-text  { font-family: Arial, sans-serif; font-size: 38px; font-weight: bold; fill: #0F172A; text-anchor: middle; }',
        '  .proc-num { font-family: Arial, sans-serif; font-size: 52px; font-weight: bold; fill: #0F172A; text-anchor: middle; }',
        '  .proc-lbl { font-family: Arial, sans-serif; font-size: 33px; font-weight: bold; fill: #0F172A; text-anchor: middle; }',
        '  .flow-lbl { font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; fill: #0F172A; text-anchor: middle; }',
        '  .conn     { stroke: #1E293B; stroke-width: 3px; fill: none; }',
        '</style>'
    ]

    # Process 0
    svg.append(f'<rect x="{proc_x}" y="{proc_y}" width="{proc_w}" height="{proc_h}" class="ent-box"/>')
    svg.append(f'<line x1="{proc_x}" y1="{proc_y+header_h}" x2="{proc_x+proc_w}" y2="{proc_y+header_h}" stroke="#1E293B" stroke-width="3"/>')
    svg.append(f'<text x="{proc_x+proc_w//2}" y="{proc_y+header_h//2+18}" class="proc-num">0</text>')

    proc_lines = [
        "Interactive 3D Granite",
        "Configurator with",
        "Design Quality",
        "Prediction and",
        "Quotation",
        "Management System"
    ]
    start_y = proc_y + header_h + 46
    for idx, line in enumerate(proc_lines):
        svg.append(f'<text x="{proc_x+proc_w//2}" y="{start_y+idx*46}" class="proc-lbl">{line}</text>')

    # Entities
    svg.append(f'<rect x="{user_x}" y="{user_y}" width="{ent_w}" height="{ent_h}" class="ent-box"/>')
    svg.append(f'<text x="{user_x+ent_w//2}" y="{user_y+ent_h//2+16}" class="ent-text">User</text>')

    svg.append(f'<rect x="{admin_x}" y="{admin_y}" width="{admin_w}" height="{admin_h}" class="ent-box"/>')
    svg.append(f'<text x="{admin_x+admin_w//2}" y="{admin_y+admin_h//2+16}" class="ent-text">Admin/Staff</text>')

    svg.append(f'<rect x="{ds_x}" y="{ds_y}" width="{ds_w}" height="{ds_h}" class="ent-box"/>')
    svg.append(f'<text x="{ds_x+ds_w//2}" y="{ds_y+ds_h//2-10}" class="ds-text">COLOURlovers</text>')
    svg.append(f'<text x="{ds_x+ds_w//2}" y="{ds_y+ds_h//2+40}" class="ds-text">Dataset</text>')

    # Flow arrows
    svg.append(f'<line x1="{user_x+ent_w}" y1="{y_flow_top}" x2="{proc_x}" y2="{y_flow_top}" class="conn" marker-end="url(#arrow-right)"/>')
    svg.append(f'<line x1="{proc_x}" y1="{y_flow_bot}" x2="{user_x+ent_w}" y2="{y_flow_bot}" class="conn" marker-end="url(#arrow-left)"/>')

    svg.append(f'<line x1="{admin_x}" y1="{y_flow_top}" x2="{proc_x+proc_w}" y2="{y_flow_top}" class="conn" marker-end="url(#arrow-left)"/>')
    svg.append(f'<line x1="{proc_x+proc_w}" y1="{y_flow_bot}" x2="{admin_x}" y2="{y_flow_bot}" class="conn" marker-end="url(#arrow-right)"/>')

    svg.append(f'<line x1="{x_center}" y1="{ds_y}" x2="{x_center}" y2="{proc_y+proc_h}" class="conn" marker-end="url(#arrow-up)"/>')

    def svg_above_label(cx, baseline_y, lines):
        line_h = 36
        total_h = len(lines) * line_h
        start_y = baseline_y - total_h + line_h // 2 + 10
        res = []
        for idx, line in enumerate(lines):
            res.append(f'<text x="{cx}" y="{start_y+idx*line_h}" class="flow-lbl">{line}</text>')
        return '\n'.join(res)

    def svg_backdrop_label(cx, cy, lines):
        line_h = 36
        total_h = len(lines) * line_h
        res = []
        res.append(f'<rect x="{cx-210}" y="{cy-total_h//2-10}" width="420" height="{total_h+20}" fill="#FFFFFF"/>')
        start_y = cy - (len(lines) - 1) * (line_h / 2) + 10
        for idx, line in enumerate(lines):
            res.append(f'<text x="{cx}" y="{start_y+idx*line_h}" class="flow-lbl">{line}</text>')
        return '\n'.join(res)

    svg.append(svg_above_label(center_left_flow_x, y_flow_top - 14, [
        "Product Design, Project Type,",
        "Custom Dimensions, and",
        "Quotation Request"
    ]))
    svg.append(svg_above_label(center_left_flow_x, y_flow_bot - 14, [
        "3D Interactive Preview,",
        "AI Quality / Color Score, and",
        "Itemized Price Quotation"
    ]))
    svg.append(svg_above_label(center_right_flow_x, y_flow_top - 14, [
        "Material Catalog & Rates,",
        "System Settings, and",
        "Inquiry Responses"
    ]))
    svg.append(svg_above_label(center_right_flow_x, y_flow_bot - 14, [
        "Customer Quotations,",
        "Inquiry Messages, and",
        "Summary Reports"
    ]))
    svg.append(svg_backdrop_label(x_center, (ds_y + proc_y + proc_h) // 2, [
        "Color Combinations &",
        "Quality Training Data"
    ]))

    svg.append('</svg>')

    out_svg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Figure_3.1_Context_Diagram.svg")
    with open(out_svg, 'w', encoding='utf-8') as f:
        f.write('\n'.join(svg))
    print(f"SVG generated at: {out_svg}")

if __name__ == "__main__":
    generate_context_diagram()
