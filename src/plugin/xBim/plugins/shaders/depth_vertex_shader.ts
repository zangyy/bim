export const depth_vertex_shader = "attribute highp vec2 point;\r\n\r\nvarying vec2 position;\r\n\r\nvoid main(void) {\r\n float x = (point.x * 2.0) - 1.0;\r\n float y = (point.y * 2.0) - 1.0;\r\n gl_Position = vec4(x, y, 0.0, 1.0);\r\n position = point;\r\n}"