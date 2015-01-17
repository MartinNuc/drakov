var lodash = require('lodash');

var mediaTypeRe = /^\s*([^;]+)/i;

function getMediaType( contentType ) {
    return contentType.match( mediaTypeRe )[0].toLowerCase();
}

function getMediaTypeFromSpecReq( specReq ) {
    if( specReq && specReq.headers ) {
        for( var i = 0; i < specReq.headers.length; i++ ) {
            if(/content\-type/i.test( specReq.headers[i].name )) {
                return getMediaType( specReq.headers[i].value );
            }
        }
    }
    return null;
}

function getMediaTypeFromHttpReq( httpReq ) {
    if( 'content-type' in httpReq.headers ) {
        return getMediaType( httpReq.headers['content-type'] );
    }
    return null;
}

function isBodyEqual( httpReq, specReq, contentType ) {
    if (!specReq && !httpReq.body){
        return true;
    }

    if (/json/i.test(contentType)){
        return lodash.isEqual(JSON.parse(httpReq.body), JSON.parse(specReq.body));
    } else {
        return httpReq.body === specReq.body;
    }
}

exports.matches = function( httpReq, specReq ) {
    var httpMediaType = getMediaTypeFromHttpReq( httpReq );
    var specMediaType = getMediaTypeFromSpecReq( specReq );
    if ( httpMediaType === specMediaType ) {
        if ( isBodyEqual(httpReq, specReq, httpMediaType ) ) {
            return true;
        } else {
            console.warn('Skip. Different body');
            return false;
        }

    } else {
        console.warn('Skip. Different content-types ', httpMediaType, " !== ", specMediaType );
        return false;
    }

};