// get successful control from form and assemble into object
// http://www.w3.org/TR/html401/interact/forms.html#h-17.13.2

// types which indicate a submit action and are not successful controls
// these will be ignored
var k_r_submitter = /^(?:submit|button|image|reset|file)$/i;

// node names which could be successful controls
var k_r_success_contrls = /^(?:input|select|textarea|keygen)/i;

// keys with brackets for hash keys
var object_brackets_regex = /\[(.+?)\]/g;
var brackets_regex = /^\[(.+?)\]$/;
// > 'people[foo][name]'.match(/\[(\d+?)?\]/)
// null
// > 'people[600][name]'.match(/\[(\d+?)?\]/)
// [ '[600]', '600', index: 6, input: 'people[600][name]' ]
var array_brackets_regex = /\[(\d+?)?\]/;
var brackeks_prefix_regex = /^(.+?)\[/;

// serializes form fields
// @param form MUST be an HTMLForm element
// @param options is an optional argument to configure the serialization. Default output
// with no options specified is a url encoded string
//    - hash: [true | false] Configure the output type. If true, the output will
//    be a js object.
//    - serializer: [function] Optional serializer function to override the default one.
//    The function takes 3 arguments (result, key, value) and should return new result
//    hash and url encoded str serializers are provided with this module
//    - disabled: [true | false]. If true serialize disabled fields.
//    - empty: [true | false]. If true serialize empty fields
function serialize(form, options) {
    if (typeof options != 'object') {
        options = { hash: !!options };
    }
    else if (options.hash === undefined) {
        options.hash = true;
    }

    var result = (options.hash) ? {} : '';
    var serializer = options.serializer || ((options.hash) ? hash_serializer : str_serialize);

    var elements = form.elements || [];

    //Object store each radio and set if it's empty or not
    var radio_store = Object.create(null);

    for (var i=0 ; i<elements.length ; ++i) {
        var element = elements[i];

        // ingore disabled fields
        if ((!options.disabled && element.disabled) || !element.name) {
            continue;
        }
        // ignore anyhting that is not considered a success field
        if (!k_r_success_contrls.test(element.nodeName) ||
            k_r_submitter.test(element.type)) {
            continue;
        }

        var key = element.name;
        var val = element.value;

        // we can't just use element.value for checkboxes cause some browsers lie to us
        // they say "on" for value when the box isn't checked
        if ((element.type === 'checkbox' || element.type === 'radio') && !element.checked) {
            val = undefined;
        }

        // If we want empty elements
        if (options.empty) {
            // for checkbox
            if (element.type === 'checkbox' && !element.checked) {
                val = '';
            }

            // for radio
            if (element.type === 'radio') {
                if (!radio_store[element.name] && !element.checked) {
                    radio_store[element.name] = false
                }
                else if (element.checked) {
                    radio_store[element.name] = true
                }
            }

            // if options empty is true, continue only if its radio
            if (!val && element.type == 'radio') {
                continue;
            }
        }
        else {
            // value-less fields are ignored unless options.empty is true
            if (!val) {
                continue;
            }
        }

        // multi select boxes
        if (element.type === 'select-multiple') {
            val = [];

            var selectOptions = element.options;
            var isSelectedOptions = false;
            for (var j=0 ; j<selectOptions.length ; ++j) {
                var option = selectOptions[j];
                if (option.selected) {
                    isSelectedOptions = true
                    result = serializer(result, key, option.value);
                }
            }

            // Serialize if no selected options and options.empty is true
            if (!isSelectedOptions && options.empty) {
                result = serializer(result, key, '');
            }

            continue;
        }
        result = serializer(result, key, val);
    }

    // Check for all empty radio buttons and serialize them with key=""
    if (options.empty) {
        for (var key in radio_store) {
            if (!radio_store[key]) {
                result = serializer(result, key, '');
            }
        }
    }

    return result;
}

function parse_keys(string) {
  console.log('== parse_keys', string)
  var keys = []

  var parent = /^([^\[\]]*)/;
  var child = /(\[[^\[\]]*\])/g;
  var match = parent.exec(string);

  if (match[1]) {
    keys.push(match[1])
  }

  while ((match = child.exec(string)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

function assign(keys, value) {
  console.log('\n\n=== assign:', keys, value)

  if (keys.length === 0) {
    return value;
  }

  var key = keys.shift();
  var between = key.match(brackets_regex);
  var result;

  if (!between) {
    result = {};
    result[key] = assign(keys, value);
  } else {
    var index = parseInt(between[1], 10);

    if (isNaN(index)) {
      result = {};
      result[between[1]] = assign(keys, value);
    } else {
      result = []
      result[index] = assign(keys, value);
    }
  }

  return result;
  //   // var index = parseInt(cleanRoot, 10);
  //   // var indexString = '' + index;
  //   // if (!isNaN(index) &&
  //   //     root !== cleanRoot &&
  //   //     indexString === cleanRoot &&
  //   //     index >= 0 &&
  //   //     (options.parseArrays &&
  //   //      index <= options.arrayLimit)) {
  //   //
  //   //     obj = [];
  //   //     obj[index] = internals.parseObject(chain, val, options);
  //   // }
  //   // else {
  //   //     obj[cleanRoot] = internals.parseObject(chain, val, options);
  //   // }
  //
  //
  //   // first match in brackes
  //   // * if string it's an object
  //   // * if number or undefined it's an array
  //
  //   // starts with an array bracket match
  //   // if () {
  //   //
  //   // } else {
  //   //   result[prefix] = {};
  //   // }
  // }
  // // if (! result[prefix]) result[prefix] = {};


}

// obj/hash encoding serializer
function hash_serializer(result, key, value) {
    console.log('\n\n=== serializing:', result, key, value)

    var keys = parse_keys(key);
    console.log('= keys', keys)
    var object = assign(keys, value);
    // var length = keys.length;
    // var last = length - 1;
    // var current = result;
    //
    // // walk the chain and assign
    // for (var i = 0; i < length; i++) {
    //   curent = parse_value(keys, value);
    // }

    console.log('= object', object)
    console.log('= results', result)

    // merge results with chain assignment

    // var previous = keys.shift()
    // // check that this isn't a bracket before assigning
    // var length = keys.length
    // for (var i = 0; i < length; i++) {
    //   var current = keys[i]
    //   console.log('current', current)
    //
    //   if (current === '[]') {
    //     previous = []
    //     continue
    //   }
    //
    //
    // }

    console.log('= keys:', keys);

    // parse keys
    // assign value to key @ appropriate selector/depth

    return result;

    // This is duplicated in extract_from_brackets
    // var is_array_key = has_array_brackets(key);
    // console.log('is_array_key:', is_array_key)
    // if (is_array_key) {
    //     key = key.replace(array_brackets_regex, '');
    //     console.log('reassigned key:', key)
    // }

    console.log('key', key)
    if (key in result) {
        var existing = result[key];
        if (!Array.isArray(existing)) {
            result[key] = [existing];
            console.log('not an array:', existing)
            console.log('result['+key+'] = '+result[key])
        }
        console.log('pushing into: ', result[key])
        result[key].push(value);
    }
    else {
        console.log('no key in:', result)
        if (has_object_brackets(key)) {
          console.log('has_object_brackets', true)
          extract_from_brackets(result, key, value);
        }
        else {
          console.log('has_object_brackets:', false)
          console.log('is_array_key', is_array_key)
          result[key] = is_array_key ? [value] : value;
        }
    }

    console.log('end result', result)
    return result;
};

// urlform encoding serializer
function str_serialize(result, key, value) {
    // encode newlines as \r\n cause the html spec says so
    value = value.replace(/(\r)?\n/g, '\r\n');
    value = encodeURIComponent(value);

    // spaces should be '+' rather than '%20'.
    value = value.replace(/%20/g, '+');
    return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + value;
};

function has_object_brackets(string) {
  return !!string.match(object_brackets_regex);
};

function has_array_brackets(string) {
    return !!string.match(array_brackets_regex);
}

function matches_between_brackets(string) {
    // Make sure to isolate object_brackets_regex from .exec() calls
    var regex = new RegExp(object_brackets_regex);
    var matches = [];
    var match;

    while (match = regex.exec(string)) {
      matches.push(match[1]);
    }

    return matches;
};

function extract_from_brackets(result, key, value) {



    var parent = result[prefix];
    var matches_between = matches_between_brackets(key);
    var length = matches_between.length;

    console.log('matches', matches_between)

    for (var i = 0; i < length; i++) {
        var child = matches_between[i];
        var isLast = (length === i + 1);

        if (isLast) {
            var existing = parent[child];

            if (existing) {
                if (! Array.isArray(existing)) {
                    parent[child] = [ existing ];
                }

                parent[child].push(value);
            }
            else {
                // Finally make the assignment
                parent[child] = value;
            }

        }
        else {
            // This is a nested key, set it properly for the next iteration
            parent[child] = parent[child] || {};
            parent = parent[child];
        }
    }

    parent = value;
};

module.exports = serialize;
