module INSPECTOR{
    
    /**
     * A Property tab can creates two panels: 
     * a tree panel and a detail panel, 
     * in which properties will be displayed.
     * Both panels are separated by a resize bar
     */
    export abstract class PropertyTab extends Tab {
        
        protected _inspector : Inspector;
        /** The panel containing a list of items */
        protected _treePanel    : HTMLElement;
        /** The panel containing a list if properties corresponding to an item */
        protected _detailsPanel    : DetailPanel;
        protected _treeItems: Array<TreeItem> = [];
        protected _searchBar : SearchBar;
        
        constructor(tabbar:TabBar, name:string, insp:Inspector) {
            super(tabbar, name);
            
            this._inspector = insp;  
            
            // Build the properties panel : a div that will contains the tree and the detail panel
            this._panel = Helpers.CreateDiv('tab-panel') as HTMLDivElement;
            
            // Search bar
            this._searchBar = new SearchBar(this);
            // Add searchbar
            this._panel.appendChild(this._searchBar.toHtml());
            
            // Build the treepanel
            this._treePanel = Helpers.CreateDiv('insp-tree', this._panel);
            
            // Build the detail panel
            this._detailsPanel = new DetailPanel();
            this._panel.appendChild(this._detailsPanel.toHtml());
            
            Split([this._treePanel, this._detailsPanel.toHtml()], {direction:'vertical'});       
            
            this.update();   
        }

        /** Overrides dispose */
        public dispose() {
            this._detailsPanel.dispose();
        }
        
        public update(_items?:Array<TreeItem>) {

            let items;   
            if (_items) {
                items = _items;
            } else {
                // Rebuild the tree
                this._treeItems = this._getTree();
                items = this._treeItems;                
            }
            // Clean the tree
            Helpers.CleanDiv(this._treePanel); 
            // Clean the detail properties
            this._detailsPanel.clean();
            
            
            // Sort items alphabetically
            items.sort((item1, item2) => {
                return item1.compareTo(item2);
            });
            
            // Display items
            for (let item of items) {
                this._treePanel.appendChild(item.toHtml());
            }
        }        
        
        /** Display the details of the given item */
        public displayDetails(item:TreeItem) {
            // Remove active state on all items
            this.activateNode(item);
            // Update the detail panel
            this._detailsPanel.details = item.getDetails();
        }
        
        /** Select an item in the tree */
        public select(item:TreeItem) {            
            // Remove the node highlight
            this.highlightNode();
            // Active the node
            this.activateNode(item);
            // Display its details
            this.displayDetails(item); 
        }
        

        /** Highlight the given node, and downplay all others */
         public highlightNode(item?:TreeItem) {
            if (this._treeItems) {
                for (let node of this._treeItems) {
                    node.highlight(false);
                }
            }
            if (item) {
                item.highlight(true);
            }
        }

        /** Set the given item as active in the tree */
        public activateNode(item:TreeItem) {
            if (this._treeItems) {
                for (let node of this._treeItems) {
                    node.active(false);
                }
            }
            item.active(true);
        }
        
        /** Returns the treeitem corersponding to the given obj, null if not found */
        public getItemFor(_obj:any) : TreeItem{
            let obj = _obj as BABYLON.AbstractMesh;
            for (let item of this._treeItems) {
                if (item.correspondsTo(obj)) {
                    return item;
                }
            }
            return null;
        }      
        
        public filter(filter:string) {            
            let items = [];
            
            for (let item of this._treeItems) {
                if (item.id.toLowerCase().indexOf(filter.toLowerCase()) != -1) {
                    items.push(item);
                }
            }    
            this.update(items);
        }
        
        /** Builds the tree panel */
        protected abstract _getTree() : Array<TreeItem>;
    } 
}