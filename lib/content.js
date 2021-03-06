var logger = require('./logger');
var lodash = require('lodash');
var urlParser = require('./url-parser');
var specSchema= require('./spec-schema');

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

function isJsonBody(contentType) {
    return contentType ? /json/i.test(contentType) : false;
}

function isMultipartContentType(contentType) {
    if(/multipart\/form-data/i.test(contentType)) {
        return true;
    }

    return false;
}

function getBodyContent(req, contentType){
    var body = null;
    if (req && req.body) {
        body = req.body.trim();
    }

    if (isJsonBody(contentType)){
        try {
            body = JSON.parse(body);
        } catch (e) {
            logger.log('[WARNING]'.red, 'JSON body could not be parsed. Using body as is.');
        }
    }

    return body;
}

function validateJson(reqBody, specBody, schema){
    if (schema){
        return specSchema.matchWithSchema(reqBody, schema);
    }
    return lodash.isEqual(reqBody, specBody);
}

function isBodyEqual( httpReq, specReq, contentType ) {
    if (!specReq && !httpReq.body){
        return true;
    }

    var reqBody = getBodyContent(httpReq, contentType);
    var specBody = getBodyContent(specReq, contentType);

    if (reqBody === specBody){
        return true;
    }

    if(isMultipartContentType(contentType)) {
        return true;
    }

    if (/application\/x-www-form-urlencoded/i.test(contentType)) {
        var jsonEncodedSpecBody = JSON.parse(specBody);
        return urlParser.jsonToFormEncodedString(jsonEncodedSpecBody) === reqBody;
    }

    if (isJsonBody(contentType)){
        return validateJson(reqBody, specBody, specReq.schema);
    }
}

function hasHeaders( httpReq, specReq ){
    if (!specReq || !specReq.headers){
        return true;
    }

    function containsHeader( header ){
        var httpReqHeader = header.name.toLowerCase();

        if(header.name === 'Content-Type'){
            return true;
        }

        if(!httpReq.headers.hasOwnProperty( httpReqHeader ) || httpReq.headers[httpReqHeader] !== header.value){
            return false;
        }

        return true;
    }

    return specReq.headers.every(containsHeader);
}

function areContentTypesSame(httpMediaType, specMediaType) {
    if(httpMediaType === specMediaType) {
        return true;
    }

    if(isMultipartContentType(httpMediaType) && isMultipartContentType(specMediaType)) {
        return true;
    }

    return false;
}

exports.matches = function( httpReq, specReq ) {
    var httpMediaType = getMediaTypeFromHttpReq( httpReq );
    var specMediaType = getMediaTypeFromSpecReq( specReq );
    if ( areContentTypesSame(httpMediaType, specMediaType) ) {
        if ( !hasHeaders( httpReq, specReq ) ){
            return false;
        }

        if ( isBodyEqual( httpReq, specReq, httpMediaType ) ) {
            return true;
        } else {
            return false;
        }

    } else {
        return false;
    }
};
