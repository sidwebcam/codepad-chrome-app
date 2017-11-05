var SidebarHandler = function () {

    this.Notifications = undefined;
    this.Editors       = undefined;

    this.dirEntry = null;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Private Sidebar
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    this._loadDirTree = function (dirTreeJson) {

        if (dirTreeJson.length === 0) {
            return false;
        }

        var $sidebar = this.getSidebar();

        var bootTreeview = function () {
            $sidebar.treeview({
                data: dirTreeJson,
                silent: false
            });
            $sidebar.treeview('collapseAll');
        };

        if ($sidebar.hasOwnProperty('treeview')) {
            $sidebar.treeview('remove', function () {
                bootTreeview();
            });
        }
        else {
            bootTreeview();
        }

        $sidebar.collapse('show');
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Public Sidebar
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    this.init = function (notifications, editors) {

        this.Notifications = notifications;
        this.Editors       = editors;

        var that     = this;
        var $sidebar = this.getSidebar();

        $sidebar.on('shown.bs.collapse', function () {
            $(window).trigger('resize');
        });

        $(document).on('click', '.node-sidebar', function () {

            var $this = $(this);

            var node = $sidebar.treeview('getNode', $this.attr('data-nodeid'));
            if (node.typeFile === 1) {
                that.dirEntry.getFile(node.path, {}, function (fileEntry) {
                    that.Editors._fileOpen(fileEntry);
                });
            }
        });
    };

    this.getSidebar = function () {
        return $(document).find('#sidebar').first();
    };


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Public Event Handlers
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////
    // File System Related
    ///////////////////////////////////
    this.onOpenDir = function () {

        var that  = this;
        var modes = [];

        chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function (dirEntry) {

            if (chrome.runtime.lastError) {
                that.Notifications.notify('danger', '', chrome.runtime.lastError.message);
                return false;
            }

            that.dirEntry = dirEntry;

            var sortFn = function (a, b) {
                if (a.typeFile !== b.typeFile) {
                    return a.typeFile > b.typeFile;
                }
                return a.text > b.text;
            };

            var buildDirTree = function (entry, callback) {

                var results = [];
                entry.createReader().readEntries(function (entries) {

                    var pending = entries.length;

                    if (!pending) {

                        var obj = {
                            text: entry.name,
                            path: entry.fullPath,
                            typeFile: 0,
                            icon: 'fa fa-fw fa-folder',
                            selectable: false
                        };

                        if (results.length > 0) {
                            results   = results.sort(sortFn);
                            obj.nodes = results;
                        }

                        callback(obj);
                    }

                    entries.forEach(function (item) {
                        if (item.isDirectory) {

                            buildDirTree(item, function (res) {
                                var obj = {
                                    text: item.name,
                                    path: item.fullPath,
                                    typeFile: 0,
                                    icon: 'fa fa-fw fa-folder',
                                    selectable: false
                                };

                                if (res.length > 0) {
                                    res       = res.sort(sortFn);
                                    obj.nodes = res;
                                }

                                results.push(obj);
                                results = results.sort(sortFn);

                                if (!--pending) {
                                    callback(results);
                                }
                            });
                        }
                        else {

                            var ext = that.Editors._fileExtFromFileEntry(item);

                            results.push({
                                text: item.name,
                                path: item.fullPath,
                                typeFile: 1,
                                icon: (modes.hasOwnProperty(ext)) ? modes[ext].icon : 'fa fa-fw fa-file fa-sidebar',
                                selectable: false
                            });

                            results = results.sort(sortFn);

                            if (!--pending) {
                                callback(results);
                            }
                        }
                    });
                });
            };

            that.Editors.getAllEditorModes().then(function (data) {
                modes = JSON.parse(data);
                buildDirTree(dirEntry, function (result) {
                    that._loadDirTree(result);
                });
            });
        });
    };
};