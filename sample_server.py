from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import shutil
import mimetypes

fetch_image_example = \
b"""<out>
    <dir>/example_folder</dir>
    <file>img2.jpg</file>
</out>"""

annotation_xml = \
b"""<annotation>
    <!-- their code only edits the tree, it doesn't actually rebuild it.
        so we can put in arbitrary tags for our own porpoises and they will get
        preserved. (i've prefixed them with c_) -->
    <!-- annotation ID in database -->
    <c_anno_id>69</c_anno_id>
    <!-- ?? -->
    <filename>img1.jpg</filename>
    <folder>example_folder</folder>
    <!-- one object tag per polygon -->
    <object>
        <!-- polygon ID in database -->
        <c_poly_id>420</c_poly_id>
        <!-- object label. idk yet how to select from a list. will need to be
            mapped to label id in db -->
        <name>licnese plate</name>
        <!-- if the object is deleted and should not show up. should always
            be 0; just don't transmit deleted objects -->
        <deleted>0</deleted>
        <!-- if the object is 'verified'. if this is set, attempting to
            manipulate the polygon gives a "this is blocked" message. should
            be set to 1 for locked polygons -->
        <verified>0</verified>
        <!-- yes/no if occluded. map to database flag -->
        <occluded>no</occluded>
        <!-- attribute box. map to notes field in db. -->
        <attributes></attributes>
        <!-- this object's relationship to others. i've disabled the ability
            to configure this. it does not need to be transmitted and can be
            discarded on reception. -->
        <parts>
            <hasparts/>
            <ispartof/>
        </parts>
        <!-- index of this object in the file. first is 0, second is 1, etc.
            automatically gets overwritten by labelme, so you can't store
            anything useful here. does not need to be transmitted and can be
            discarded on reception. -->
        <id>0</id>
        <polygon>
            <!-- username of who placed this polygon. this should always be the
                logged in user so they can edit all the polygons. ignore on
                reception. -->
            <username>hi</username>
            <!-- list of points in the polygon. map to points array in db. order
                is important. -->
            <pt>
                <x>1458</x>
                <y>1647</y>
            </pt>
            <pt>
                <x>1458</x>
                <y>1700</y>
            </pt>
            <pt>
                <x>1595</x>
                <y>1700</y>
            </pt>
            <pt>
                <x>1590</x>
                <y>1660</y>
            </pt>
        </polygon>
    </object>
    <object>
        <name>ladder</name>
        <deleted>0</deleted>
        <verified>0</verified>
        <occluded>no</occluded>
        <attributes></attributes>
        <parts>
            <hasparts/>
            <ispartof/>
        </parts>
        <id>1</id>
        <polygon>
            <username>hi</username>
            <pt>
                <x>1867</x>
                <y>1159</y>
            </pt>
            <pt>
                <x>2410</x>
                <y>20</y>
            </pt>
            <pt>
                <x>2483</x>
                <y>13</y>
            </pt>
            <pt>
                <x>1986</x>
                <y>1832</y>
            </pt>
        </polygon>
    </object>
    <!-- sent back to sort of audit what happens? doesn't need to be transmitted
        and can be discarded on reception. -->
    <private>
        <global_count>2</global_count>
        <pri_username>hi</pri_username>
        <edited>1</edited>
        <old_name>ladder</old_name>
        <new_name>ladder</new_name>
        <modified_cpts>cpts_modified</modified_cpts>
        <video>0</video>
    </private>
</annotation>"""

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        mode, path, query_params = self.get_path_mode()
        print(mode, path)
        if mode == "404":
            self.send_error(404)
        elif mode == "file":
            try:
                f = open(path, "rb")
            except OSError:
                self.send_error(404)
            else:
                self.send_response(200)
                # MIME types REQUIRED:
                # text/xhtml for tool.xhtml or polygons will not render
                # MIME types that are good:
                # text/xml for xml files (and CGI results)
                # application/javascript for js
                # the images and CSS too
                self.send_header("Content-type", mimetypes.guess_type(path)[0])
                self.end_headers()
                shutil.copyfileobj(f, self.wfile)
                f.close()
        elif mode == "cgi":
            self.get_cgi(path, query_params)
        elif mode == "anno":
            self.send_data(annotation_xml)
        else:
            self.send_error(404)

    def do_POST(self):
        mode, path, query_params = self.get_path_mode()
        print(mode, path)
        if mode == "404":
            self.send_error(404)
        elif mode == "cgi":
            self.post_cgi(path, query_params)
        else:
            self.send_error(404)

    # for the current path, figure out what we should do with it.
    # returns a "mode" and then a path that the mode operates on, and
    # any query params
    def get_path_mode(self):
        # split the path on the first question mark, anything remaining is query
        p = self.path.split("?", 1)
        if len(p) == 1:
            page_path, qs = p[0], ""
        else:
            page_path, qs = p
        query_params = urllib.parse.parse_qs(qs)

        # vaguely sanitize and canonicalize the path. probably not safe.
        # split on directory separators, ignoring leading one
        path_parts = page_path[1:].split("/")
        path_parts = filter(
            lambda p: p != "." and p != ".." and p != "", path_parts)
        path_parts = tuple(path_parts)

        file_path = "/".join(path_parts)
        if path_parts[0] == "tool.xhtml":
            return "file", file_path, query_params
        elif path_parts[0] == "annotationTools":
            if path_parts[1] != "perl":
                return "file", file_path, query_params
            else:
                return "cgi", path_parts[2], query_params
        elif path_parts[0] == "Images":
            return "file", file_path, query_params
        elif path_parts[0] == "Icons":
            return "file", file_path, query_params
        elif path_parts[0] == "Annotations":
            return "anno", "/".join(path_parts[1:]), query_params
        return "404", "", query_params

    def get_cgi(self, path, params):
        if path == "fetch_image.cgi":
            self.send_data(fetch_image_example)
        else:
            self.send_error(404)

    def post_cgi(self, path, params):
        if path == "submit.cgi":
            global annotation_xml
            annotation_xml = \
                self.rfile.read(int(self.headers["Content-Length"]))
            print(annotation_xml.decode("ascii"))
            self.send_data(b"<nop/>")
        else:
            self.send_error(404)

    def send_data(self, data):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(data)

server_address = ('localhost', 8000)
httpd = HTTPServer(server_address, Handler)
httpd.serve_forever()
