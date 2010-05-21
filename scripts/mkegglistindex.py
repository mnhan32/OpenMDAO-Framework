"""
This creates an index.html file for the find-links directory on the openmdao.org site.
"""


import sys
import os.path
import hashlib
import fnmatch


FIND_LINKS_URL = 'http://openmdao.org/dists'


def find_files(pats, startdir):
    """Return a list of files (using a generator) that match
    the given list of glob patterns. Walks an entire directory structure.
    """
    match = fnmatch.fnmatch
    join = os.path.join
    for path, dirlist, filelist in os.walk(startdir):
        for name in filelist:
            for pat in pats:
                if match(name, pat):
                    yield join(path, name)


def file_md5(fpath):
    """Return the MD5 digest for the given file"""
    try:
        f = open(fpath,'rb')
        m = hashlib.md5()
        while True:
            s = f.read(4096)
            if not s:
                break
            m.update(s)
        return m.hexdigest()
    finally:
        f.close()


def make_egglist_index(startdir = '.'):
    startdir = os.path.abspath(startdir)
    out = open('index.html', 'w')
    out.write('<html>\n<body>\n')
    for f in find_files(["*.egg", "*.tar.gz", "*.zip"], startdir):
        checksum = file_md5(f)
        basef = os.path.basename(f)
        lpath = os.path.join(FIND_LINKS_URL, basef)
        out.write('<li><a href="%s#md5=%s">%s</a>\n' % (lpath, checksum, basef))
    out.write('</ul>\n</body>\n</html>')
    out.close()
    

if __name__ == '__main__':
    if len(sys.argv) > 1:
        make_egglist_index(sys.argv[1])
    else:
        make_egglist_index()