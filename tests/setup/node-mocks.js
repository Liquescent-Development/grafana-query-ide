// Node.js mocks for browser APIs
// This file provides Node.js compatible mocks for browser-specific APIs used in tests

(function() {
    'use strict';

    // Mock DOM elements and methods
    if (!global.document) {
        global.document = {
            createElement: function(tagName) {
                const element = {
                    tagName: tagName.toUpperCase(),
                    id: '',
                    className: '',
                    _innerHTML: '',
                    textContent: '',
                    value: '',
                    checked: false,
                    style: {},
                    dataset: {},
                    parentNode: null,
                    children: [],
                    
                    appendChild: function(child) {
                        this.children.push(child);
                        child.parentNode = this;
                        return child;
                    },
                    
                    removeChild: function(child) {
                        const index = this.children.indexOf(child);
                        if (index > -1) {
                            this.children.splice(index, 1);
                            child.parentNode = null;
                        }
                        return child;
                    },
                    
                    remove: function() {
                        if (this.parentNode) {
                            this.parentNode.removeChild(this);
                        }
                    },
                    
                    setAttribute: function(name, value) {
                        this[name] = value;
                    },
                    
                    getAttribute: function(name) {
                        return this[name] || null;
                    },
                    
                    addEventListener: function(event, handler) {
                        // Store event handlers for potential testing
                        this._eventHandlers = this._eventHandlers || {};
                        this._eventHandlers[event] = this._eventHandlers[event] || [];
                        this._eventHandlers[event].push(handler);
                    },
                    
                    removeEventListener: function(event, handler) {
                        if (this._eventHandlers && this._eventHandlers[event]) {
                            const index = this._eventHandlers[event].indexOf(handler);
                            if (index > -1) {
                                this._eventHandlers[event].splice(index, 1);
                            }
                        }
                    }
                };
                
                // Define innerHTML as a proper property with getter/setter
                Object.defineProperty(element, 'innerHTML', {
                    get: function() {
                        return this._innerHTML;
                    },
                    set: function(value) {
                        this._innerHTML = value;
                        // Clear children when innerHTML is set
                        this.children = [];
                    },
                    enumerable: true,
                    configurable: true
                });
                
                return element;
            },

            getElementById: function(id) {
                // For test environments, we want to find elements that were actually added to the DOM
                // Check if there are any child elements in body with this ID
                if (this.body && this.body.children) {
                    for (let i = this.body.children.length - 1; i >= 0; i--) {
                        const child = this.body.children[i];
                        if (child.id === id) {
                            return child;
                        }
                    }
                }
                
                // Check if element already exists in cache
                if (this._elementCache && this._elementCache[id]) {
                    const cachedElement = this._elementCache[id];
                    // Check if the cached element is still in the DOM tree by checking parentNode
                    if (cachedElement.parentNode) {
                        return cachedElement;
                    } else {
                        // Element was removed from DOM, remove from cache
                        delete this._elementCache[id];
                    }
                }
                
                // Initialize element cache
                if (!this._elementCache) {
                    this._elementCache = {};
                }
                
                // Create a mock element with the requested ID
                const element = this.createElement('div');
                element.id = id;
                
                // Add common properties based on common element IDs
                switch (id) {
                    case 'timeFrom':
                    case 'timeTo':
                    case 'maxDataPoints':
                    case 'intervalMs':
                        element.tagName = 'INPUT';
                        element.type = 'number';
                        element.value = id === 'timeFrom' ? '1' : id === 'timeTo' ? '0' : '1000';
                        break;
                    case 'instantQuery':
                        element.tagName = 'INPUT';
                        element.type = 'checkbox';
                        element.checked = false;
                        break;
                    case 'datasource':
                    case 'datasourceList':
                        element.tagName = 'SELECT';
                        element.selectedOptions = [];
                        // For datasourceList specifically, ensure it has options
                        if (id === 'datasourceList') {
                            element.options = [
                                { value: 'test-ds-123', text: 'Test InfluxDB', selected: true }
                            ];
                            element.selectedIndex = 0;
                        }
                        break;
                    case 'results':
                    case 'schemaContainer':
                    case 'variablesContainer':
                    case 'variablesSection':
                        element.innerHTML = '';
                        break;
                    default:
                        element.innerHTML = '';
                        break;
                }
                
                // Cache the element for persistence
                this._elementCache[id] = element;
                
                return element;
            },

            querySelector: function(selector) {
                // Handle specific selectors for datasource elements
                if (selector.includes('datasourceList') && selector.includes('data-uid')) {
                    // Extract the datasource UID from the selector
                    const match = selector.match(/data-uid="([^"]+)"/);
                    if (match) {
                        const uid = match[1];
                        const element = this.createElement('div');
                        element.className = 'datasource-item';
                        element.dataset = { 
                            uid: uid,
                            type: uid.includes('prometheus') ? 'prometheus' : 'influxdb'
                        };
                        // Set the actual data-uid attribute
                        element.setAttribute('data-uid', uid);
                        return element;
                    }
                }
                
                // Simple mock that returns a basic element
                return this.createElement('div');
            },

            querySelectorAll: function(selector) {
                // Return empty NodeList-like array
                return [];
            },

            body: {
                children: [],
                
                appendChild: function(child) {
                    // Mock body appendChild with actual tracking
                    this.children.push(child);
                    child.parentNode = this;
                    return child;
                },
                
                removeChild: function(child) {
                    // Mock body removeChild with actual tracking
                    const index = this.children.indexOf(child);
                    if (index > -1) {
                        this.children.splice(index, 1);
                        child.parentNode = null;
                    }
                    return child;
                }
            },

            addEventListener: function(event, handler) {
                // Mock document event listeners
            },

            removeEventListener: function(event, handler) {
                // Mock document event listener removal
            }
        };
    }

    // Mock window object
    if (!global.window) {
        global.window = global;
        global.window.document = global.document;
    }

    // Mock localStorage
    if (!global.localStorage) {
        global.localStorage = {
            data: {},
            
            getItem: function(key) {
                return this.data[key] || null;
            },
            
            setItem: function(key, value) {
                this.data[key] = String(value);
            },
            
            removeItem: function(key) {
                delete this.data[key];
            },
            
            clear: function() {
                this.data = {};
            },
            
            key: function(index) {
                const keys = Object.keys(this.data);
                return keys[index] || null;
            },
            
            get length() {
                return Object.keys(this.data).length;
            }
        };
    }

    // Mock performance API
    if (!global.performance) {
        global.performance = {
            now: function() {
                return Date.now();
            },
            
            timing: {
                navigationStart: Date.now()
            }
        };
    }

    // Mock requestAnimationFrame and cancelAnimationFrame
    if (!global.requestAnimationFrame) {
        global.requestAnimationFrame = function(callback) {
            return setTimeout(callback, 16); // ~60fps
        };
    }

    if (!global.cancelAnimationFrame) {
        global.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

    // Mock URL constructor
    if (!global.URL) {
        global.URL = class MockURL {
            constructor(url, base) {
                this.href = url;
                this.origin = 'http://localhost:3000';
                this.protocol = 'http:';
                this.hostname = 'localhost';
                this.port = '3000';
                this.pathname = '/';
                this.search = '';
                this.hash = '';
            }

            toString() {
                return this.href;
            }
        };
    }

    // Mock URLSearchParams
    if (!global.URLSearchParams) {
        global.URLSearchParams = class MockURLSearchParams {
            constructor(init) {
                this.params = new Map();
                if (typeof init === 'string') {
                    // Parse query string
                    const pairs = init.split('&');
                    pairs.forEach(pair => {
                        const [key, value] = pair.split('=');
                        if (key) {
                            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
                        }
                    });
                } else if (init && typeof init === 'object') {
                    Object.entries(init).forEach(([key, value]) => {
                        this.params.set(key, value);
                    });
                }
            }

            append(name, value) {
                this.params.set(name, value);
            }

            delete(name) {
                this.params.delete(name);
            }

            get(name) {
                return this.params.get(name);
            }

            has(name) {
                return this.params.has(name);
            }

            set(name, value) {
                this.params.set(name, value);
            }

            toString() {
                const pairs = [];
                this.params.forEach((value, key) => {
                    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                });
                return pairs.join('&');
            }

            [Symbol.iterator]() {
                return this.params[Symbol.iterator]();
            }
        };
    }

    // Mock Headers constructor for fetch API
    if (!global.Headers) {
        global.Headers = class MockHeaders {
            constructor(init) {
                this.headers = new Map();
                if (init) {
                    if (init instanceof Headers) {
                        init.forEach((value, key) => {
                            this.headers.set(key.toLowerCase(), value);
                        });
                    } else if (Array.isArray(init)) {
                        init.forEach(([key, value]) => {
                            this.headers.set(key.toLowerCase(), value);
                        });
                    } else if (typeof init === 'object') {
                        Object.entries(init).forEach(([key, value]) => {
                            this.headers.set(key.toLowerCase(), value);
                        });
                    }
                }
            }

            append(name, value) {
                const existing = this.headers.get(name.toLowerCase());
                if (existing) {
                    this.headers.set(name.toLowerCase(), `${existing}, ${value}`);
                } else {
                    this.headers.set(name.toLowerCase(), value);
                }
            }

            delete(name) {
                this.headers.delete(name.toLowerCase());
            }

            get(name) {
                return this.headers.get(name.toLowerCase()) || null;
            }

            has(name) {
                return this.headers.has(name.toLowerCase());
            }

            set(name, value) {
                this.headers.set(name.toLowerCase(), value);
            }

            forEach(callback, thisArg) {
                this.headers.forEach((value, key) => {
                    callback.call(thisArg, value, key, this);
                });
            }
        };
    }

    // Mock TextEncoder and TextDecoder
    if (!global.TextEncoder) {
        global.TextEncoder = class MockTextEncoder {
            encode(input) {
                // Simple UTF-8 encoding simulation
                const buffer = Buffer.from(input, 'utf8');
                return new Uint8Array(buffer);
            }
        };
    }

    if (!global.TextDecoder) {
        global.TextDecoder = class MockTextDecoder {
            constructor(encoding = 'utf-8') {
                this.encoding = encoding;
            }

            decode(input) {
                // Simple UTF-8 decoding simulation
                if (input instanceof Uint8Array) {
                    return Buffer.from(input).toString('utf8');
                }
                return String(input);
            }
        };
    }

    // Mock console methods if they don't exist (shouldn't happen in Node.js)
    ['log', 'warn', 'error', 'info', 'debug', 'trace'].forEach(method => {
        if (!console[method]) {
            console[method] = function() {
                console.log.apply(console, arguments);
            };
        }
    });

    // Mock crypto.getRandomValues for test environment
    if (!global.crypto) {
        global.crypto = {
            getRandomValues: function(array) {
                for (let i = 0; i < array.length; i++) {
                    array[i] = Math.floor(Math.random() * 256);
                }
                return array;
            }
        };
    }

    console.log('✅ Node.js mocks initialized');
})();