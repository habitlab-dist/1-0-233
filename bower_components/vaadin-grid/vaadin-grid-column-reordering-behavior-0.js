
  window.vaadin = window.vaadin || {};
  vaadin.elements = vaadin.elements || {};
  vaadin.elements.grid = vaadin.elements.grid || {};

  /**
   * @polymerBehavior vaadin.elements.grid.ColumnReorderingBehavior
   */
  vaadin.elements.grid.ColumnReorderingBehavior = {

    properties: {

      /**
       * Set to true to allow column reordering.
       */
      columnReorderingAllowed: {
        type: Boolean,
        value: false
      }

    }

  };

  /**
   * @polymerBehavior vaadin.elements.grid.TableColumnReorderingBehavior
   */
  vaadin.elements.grid.TableColumnReorderingBehavior = {

    properties: {

      _orderBaseScope: {
        type: Number,
        value: 10000000
      }

    },

    listeners: {
      'dragstart': '_onDragStart',
      'dragover': '_onDragOver',
      'dragend': '_onDragEnd'
    },

    observers: [
      '_updateOrders(columnTree, columnTree.*)',
    ],

    _updateOrders: function(columnTree, splices) {
      // Set order numbers to top-level columns
      columnTree[0].forEach(function(column, index) {
        column._order = (index + 1) * this._orderBaseScope;
      }, this);
    },

    _onDragStart: function(e) {
      var cell = this._getCellByCellContent(e.target);
      if (cell) {
        this.toggleAttribute('reordering', true);
        this._draggedColumn = cell.column;
        this._setSiblingsReorderStatus(this._draggedColumn, 'allowed');
        this._draggedColumn._reorderStatus = 'dragging';

        if (e.dataTransfer) {
          // Need to set any data to enable D&D on Firefox
          e.dataTransfer.setData('text', '');
          e.dataTransfer.effectAllowed = 'move';
        }

        this._autoScroller();
      }
    },

    _setSiblingsReorderStatus: function(column, status) {
      Polymer.dom(Polymer.dom(column).parentNode).children.filter(function(child) {
        return /column/.test(child.localName) && this._isSwapAllowed(child, column);
      }, this).forEach(function(sibling) {
        sibling._reorderStatus = status;
      });
    },

    _onDragOver: function(e) {
      e.preventDefault();
      var targetCell = this._getCellByCellContent(e.target);
      var targetColumn = this._getTargetColumn(targetCell, this._draggedColumn);

      if (targetColumn &&
        this._isSwapAllowed(this._draggedColumn, targetColumn) &&
        this._isSwappableByPosition(targetColumn, e.clientX)) {
        this._swapColumnOrders(this._draggedColumn, targetColumn);
      }

      this._lastDragClientX = e.clientX;
    },

    _autoScroller: function() {
      if (this._lastDragClientX) {
        var rightDiff = this._lastDragClientX - this.getBoundingClientRect().right + 50;
        var leftDiff = this.getBoundingClientRect().left - this._lastDragClientX + 50;

        if (rightDiff > 0) {
          this.$.table.scrollLeft += rightDiff / 10;
        } else if (leftDiff > 0) {
          this.$.table.scrollLeft -= leftDiff / 10;
        }
        this._scrollHandler();
      }

      if (this._draggedColumn) {
        this.async(this._autoScroller, 10);
      }
    },

    _onDragEnd: function(e) {
      this.toggleAttribute('reordering', false);
      this._draggedColumn._reorderStatus = '';
      this._setSiblingsReorderStatus(this._draggedColumn, '');
      this._draggedColumn = null;
      this._lastDragClientX = null;
    },

    _isSwapAllowed: function(column1, column2) {
      if (column1 && column2) {
        var differentColumns = column1 !== column2;
        var sameParent = column1.parentElement === column2.parentElement;
        var sameFrozen = column1.frozen === column2.frozen;
        return differentColumns && sameParent && sameFrozen;
      }
    },

    _isSwappableByPosition: function(targetColumn, clientX) {
      var targetCell = Polymer.dom(this.$.header).querySelectorAll('th').filter(function(cell) {
        return cell.column === targetColumn;
      })[0];
      var sourceCellRect = this.$.header.querySelector('[reorder-status=dragging]').getBoundingClientRect();

      if (targetCell.getBoundingClientRect().left > sourceCellRect.left) {
        return clientX > targetCell.getBoundingClientRect().right - sourceCellRect.width;
      } else {
        return clientX < targetCell.getBoundingClientRect().left + sourceCellRect.width;
      }
    },

    _getCellByCellContent: function(cellContent) {
      if (cellContent) {
        var contentId = null;
        while (contentId === null && cellContent !== this.target && cellContent) {
          if (cellContent.localName === 'vaadin-grid-cell-content') {
            contentId = cellContent.id;
          }
          cellContent = cellContent.parentElement;
        }

        if (contentId !== null) {
          var injectionPoint = Polymer.dom(this.$.table).querySelector('content[select="#' + contentId + '"]');
          return Polymer.dom(injectionPoint).parentNode;
        }
      }
    },

    _swapColumnOrders: function(column1, column2) {
      var _order = column1._order;
      column1._order = column2._order;
      column2._order = _order;
      this._updateLastFrozen();
      this._updateLastColumn();
    },

    _getTargetColumn: function(targetCell, draggedColumn) {
      if (targetCell && draggedColumn) {
        var candidate = targetCell.column;
        while (candidate.parentElement !== draggedColumn.parentElement && candidate !== this.target) {
          candidate = candidate.parentElement;
        }
        if (candidate.parentElement === draggedColumn.parentElement) {
          return candidate;
        } else {
          return targetCell.column;
        }
      }
    }

  };
