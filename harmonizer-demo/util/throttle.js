/*
throttle
*/'use strict'

var isInteger = require('mout/lang/isInteger')
var slice = require('mout/array/slice')

var defer = require('prime/defer')

var _throttle = function(fn, method, context){
    var queued, args, cancel

    return function(){
        args = arguments
        if (!queued) {
            queued = true
            cancel = method(function(time){
                queued = false
                fn.apply(context, slice(args).concat(time))
            })
        }
        return cancel
    }

}

var throttle = function(callback, argument, context){
    if (isInteger(argument)) return throttle.timeout(callback, argument, context)
    else return throttle.immediate(callback, argument)
}

throttle.timeout = function(callback, ms, context){
    return _throttle(callback, function(run){
        return defer.timeout(run, ms, context)
    }, context)

}

throttle.frame = function(callback, context){
    return _throttle(callback, function(run){
        return defer.frame(run, context)
    }, context)
}

throttle.immediate = function(callback, context){
    return _throttle(callback, function(run){
        return defer.immediate(run, context)
    }, context)
}

module.exports = throttle
