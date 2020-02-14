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
<cool_tag>69</cool_tag>
    <filename>img1.jpg</filename>
    <folder>example_folder</folder>
    <source>
        <sourceImage>The MIT-CSAIL database of objects and scenes</sourceImage>
        <sourceAnnotation>LabelMe Webtool</sourceAnnotation>
    </source>
    <object>
        <name>licnese plate</name>
        <deleted>0</deleted>
        <verified>0</verified>
        <occluded>no</occluded>
        <attributes/>
        <parts>
            <hasparts/>
            <ispartof/>
        </parts>
        <id>0</id>
        <polygon>
        <cool_tag2>69</cool_tag2>
            <username>hi</username>
            <pt>
                <x>1458</x>
                <y>1647</y>
                <time>13-02-20 12:40:48:376</time>
            </pt>
            <pt>
                <x>1458</x>
                <y>1700</y>
                <time>13-02-20 12:40:48:753</time>
            </pt>
            <pt>
                <x>1595</x>
                <y>1700</y>
                <time>13-02-20 12:40:49:172</time>
            </pt>
            <pt>
                <x>1590</x>
                <y>1660</y>
                <time>13-02-20 12:40:49:575</time>
            </pt>
            <closed_date>13-02-20 12:40:50:218</closed_date>
        </polygon>
    </object>
    <object>
        <name>ladder</name>
        <deleted>0</deleted>
        <verified>0</verified>
        <occluded>no</occluded>
        <attributes/>
        <parts>
            <hasparts/>
            <ispartof/>
        </parts>
        <id>4</id>
        <polygon>
            <username>hi</username>
            <pt>
                <x>1867</x>
                <y>1159</y>
                <time>13-02-20 12:40:54:044</time>
            </pt>
            <pt>
                <x>2410</x>
                <y>20</y>
                <time>13-02-20 12:40:54:961</time>
            </pt>
            <pt>
                <x>2483</x>
                <y>13</y>
                <time>13-02-20 12:40:55:542</time>
            </pt>
            <pt>
                <x>1986</x>
                <y>1832</y>
                <time>13-02-20 12:40:56:565</time>
            </pt>
            <closed_date>13-02-20 12:40:57:110</closed_date>
        </polygon>
    </object>
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
        elif path_parts[0] == "annotationCache":
            # why does it need stuff from here?
            return "file", file_path, query_params
        return "404", "", query_params

    def get_cgi(self, path, params):
        if path == "fetch_image.cgi":
            self.send_data(fetch_image_example)
        else:
            self.send_error(404)

    def post_cgi(self, path, params):
        if path == "write_logfile.cgi":
            print(self.rfile.read(int(self.headers["Content-Length"])))
            self.send_data(b"<nop/>")
        elif path == "submit.cgi":
            global annotation_xml
            annotation_xml = \
                self.rfile.read(int(self.headers["Content-Length"]))
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