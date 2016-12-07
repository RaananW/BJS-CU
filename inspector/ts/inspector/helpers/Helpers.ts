module INSPECTOR {
    export class Helpers {
        
        
        /** 
         * Returns the type of the given object. First
         * uses getClassName. If nothing is returned, used the type of the constructor
         */
        public static GET_TYPE(obj:any) : string{
            if (obj != null && obj != undefined) {
                let classname = BABYLON.Tools.getClassName(obj);
                if (!classname || classname === 'object'){
                    classname = obj.constructor.name;
                    // classname is undefined in IE11
                    if (!classname) {
                        classname = this._GetFnName(obj.constructor);
                    }
                }
                return classname;
            } else {
                return '';
            }
        }

        /**
         * Returns the name of a function (workaround to get object type for IE11)
         */
        private static _GetFnName(fn) {
            var f = typeof fn == 'function';
            var s = f && ((fn.name && ['', fn.name]) || fn.toString().match(/function ([^\(]+)/));
            return (!f && 'not a function') || (s && s[1] || 'anonymous');
        }
        
        /** Send the event which name is given in parameter to the window */
        public static SEND_EVENT(eventName:string){
            let event;
            if (Inspector.DOCUMENT.createEvent) {
                event = Inspector.DOCUMENT.createEvent('HTMLEvents');
                event.initEvent(eventName, true, true);
            } else {
                event = new Event(eventName);
            }
            window.dispatchEvent(event);
        }
        
        /** Returns the given number with 2 decimal number max if a decimal part exists */
        public static Trunc(nb) :number {
            if(Math.round(nb) !== nb) {
                return nb.toFixed(2);
            }
            return nb;
        };
        
        /**
         * Useful function used to create a div
         */
        public static CreateDiv(className?:string, parent?: HTMLElement) : HTMLElement{
            return Helpers.CreateElement('div', className, parent);
        }
        
        public static CreateElement(element:string, className?:string, parent?: HTMLElement) : HTMLElement{
            let elem = Inspector.DOCUMENT.createElement(element);
            
            if (className) {
                elem.className = className;
            }
            if (parent) {
                parent.appendChild(elem);
            }
            return elem;
        }
        
        /**
         * Removes all children of the given div.
         */
        public static CleanDiv(div:HTMLElement) {
            while ( div.firstChild ) {
                div.removeChild(div.firstChild);
            }
        }
        
        public static LoadScript() {
            BABYLON.Tools.LoadFile("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.7.0/highlight.min.js", (elem) => {
                let script = Helpers.CreateElement('script', '', Inspector.DOCUMENT.body);
                script.textContent = elem;                
                
                // Load glsl detection
                BABYLON.Tools.LoadFile("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.7.0/languages/glsl.min.js", (elem) => {
                    let script = Helpers.CreateElement('script', '', Inspector.DOCUMENT.body);
                    script.textContent = elem;                    
                    
                    // Load css style
                    BABYLON.Tools.LoadFile("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.7.0/styles/zenburn.min.css", (elem) => {
                        let style = Helpers.CreateElement('style', '', Inspector.DOCUMENT.body);
                        style.textContent = elem;
                    });
                }, null, null, null, () => {
                    console.log("erreur");
                });      
                
            }, null, null, null, () => {
                console.log("erreur");
            });
            
        }

    }
}