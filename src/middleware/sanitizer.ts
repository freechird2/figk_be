const sanitizeHtml = require('sanitize-html')

// **** document ****
// https://www.npmjs.com/package/sanitize-html

// **** sinitize default options ****
/*
sanitizeHtml(dirty, {
    allowedTags: [
      "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4",
      "h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div",
      "dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p", "pre",
      "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn",
      "em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp",
      "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption",
      "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr"
    ],

    disallowedTagsMode: 'discard',

    allowedAttributes: {
      a: [ 'href', 'name', 'target' ],
      // We don't currently allow img itself by default, but
      // these attributes would make sense if we did.
      img: [ 'src', 'srcset', 'alt', 'title', 'width', 'height', 'loading' ]
    },

    // Lots of these won't come up by default because we don't allow them
    selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ],

    // URL schemes we permit
    allowedSchemes: [ 'http', 'https', 'ftp', 'mailto', 'tel' ],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: [ 'href', 'src', 'cite' ],
    allowProtocolRelative: true,
    enforceHtmlBoundary: false
}
*/

/*
    // **** custom setting 값 설명 ****

    allowedTags:['h1', 'a'], // h1 , a 태그 허용
    allowedAttributes: { a: ['href'] }, // a 태그의 href 속성 허용
    allowedFrameHostnames: ['www.youtube.com'] // iframe 허용하되 유튜브 사이트만 허용
*/

// custom setting
const sanitizeOption = {
    allowedTags: ['h1', 'h2', 'strong', 'em', 'b', 'i', 'u', 's', 'p', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span'],
    allowedAttributes: {
        span: ['style'],
        p: ['style'],
        strong: ['style'],
        em: ['style'],
        img: ['src'],
    },
    // allowedSchemes: ['data', 'http'],
}

// xss filter middleware
exports.sanitizer = (req, res, next) => {
    for (let p in req.body) {
        if (typeof req.body[p] === 'string' || typeof req.body[p] === 'number') {
            let param = p === 'phone' ? req.body[p].replace(/[^0-9]/g, '') : req.body[p]

            if (param && typeof param === 'string') param = param.replace(/</g, '&lt;').replace(/>/g, '&gt;')

            const value = sanitizeHtml(param, sanitizeOption)

            if (!value) {
                delete req.body[p]
                continue
            }

            req.body[p] =
                typeof req.body[p] === 'string' ? value.replace(/'/g, "\\'") : typeof req.body[p] === 'number' ? Number(value) : value
        }
    }

    for (let p in req.query) {
        if (typeof req.query[p] === 'string' || typeof req.query[p] === 'number') {
            let param = p === 'phone' ? req.query[p].replace(/[^0-9]/g, '') : req.query[p]

            if (param && typeof param === 'string') param = param.replace(/</g, '&lt;').replace(/>/g, '&gt;')

            const value = sanitizeHtml(param, sanitizeOption)

            if (!value) {
                delete req.query[p]
                continue
            }

            req.query[p] =
                typeof req.query[p] === 'string' ? value.replace(/'/g, "\\'") : typeof req.query[p] === 'number' ? Number(value) : value
        }
    }

    next() // 다음 미들웨어로
}
