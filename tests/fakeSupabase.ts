type Row = Record<string, any>;

export class FakeSupabase {
  tables: Record<string, Row[]> = {};
  listeners: Array<{ table: string; filter?: any; cb: Function }> = [];

  constructor() {
    this.tables = {
      rooms: [],
      players: [],
      theme_items: [],
      player_assignments: [],
      reveal_confirmations: [],
    };
  }

  clone(row: any) {
    return JSON.parse(JSON.stringify(row));
  }

  from(table: string) {
    const self = this;
    const chain: any = {
      table,
      filters: {},
      error: null,
      data: null,
      count: null,
      _order: null,
      select(selectStr?: string, opts?: any) {
        this._selectStr = selectStr;
        this._opts = opts;
        return this;
      },
      eq(field: string, val: any) {
        this.filters[field] = val;
        return this;
      },
      order(field: string, opts?: any) {
        this._order = { field, opts };
        return this;
      },
      maybeSingle() {
        const rows = this._apply();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      delete() {
        this._op = 'delete';
        return this;
      },
      insert(rows: any[]) {
        const list = Array.isArray(rows) ? rows : [rows];
        list.forEach((r: any) => {
          const clone = self.clone(r);
          if (!clone.id) clone.id = Math.random().toString(36).slice(2, 10);
          self.tables[table].push(clone);
        });
        this.data = list;
        this.error = null;
        this._notify(table, 'INSERT');
        return this;
      },
      update(obj: any) {
        this._op = 'update';
        this._updateObj = obj;
        return this;
      },
      upsert(rows: any[], opts?: any) {
        const list = Array.isArray(rows) ? rows : [rows];
        list.forEach((r: any) => {
          const pk = r.player_id ?? r.id;
          const existing = self.tables[table].find((x) => (pk ? (x.player_id === pk || x.id === pk) : false));
          if (existing) Object.assign(existing, r);
          else self.tables[table].push(self.clone(r));
        });
        this.data = list;
        this.error = null;
        this._notify(table, 'UPSERT');
        return Promise.resolve({ data: list, error: null });
      },
      then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
        let rows;
        if (this._op === 'delete') {
          rows = this._deleteMatches();
        } else if (this._op === 'update') {
          rows = this._updateMatches();
        } else {
          rows = this._apply();
        }

        const payload = {
          data: rows,
          error: this.error,
          count: this._opts?.count === 'exact' ? rows.length : undefined,
        };
        return Promise.resolve(payload).then(onFulfilled, onRejected);
      },
      _deleteMatches() {
        const before = self.tables[table] || [];
        const removed = before.filter((r) => this._matches(r));
        self.tables[table] = before.filter((r) => !this._matches(r));
        this.data = removed;
        this.error = null;
        this._notify(table, 'DELETE');
        return removed.map((r) => self.clone(r));
      },
      _updateMatches() {
        const rows = (self.tables[table] || []).filter((r) => this._matches(r));
        rows.forEach((r) => Object.assign(r, this._updateObj));
        this.data = rows.map((r) => self.clone(r));
        this.error = null;
        this._notify(table, 'UPDATE');
        return this.data;
      },
      _apply() {
        let rows = self.tables[table] || [];
        rows = rows.filter((r) => this._matches(r));
        if (this._order) rows = [...rows].sort((a: any, b: any) => Number(a[this._order.field] ?? 0) - Number(b[this._order.field] ?? 0));
        return rows.map((r) => self.clone(r));
      },
      _matches(row: any) {
        for (const k of Object.keys(this.filters || {})) {
          if (row[k] !== this.filters[k]) return false;
        }
        return true;
      },
      _notify(t: string, ev: string) { self._dispatch(t, ev); },
    };

    return chain;
  }

  _dispatch(table: string, ev: string) {
    this.listeners.forEach((l) => {
      if (l.table === table) l.cb({ eventType: ev, table });
    });
  }

  channel(name: string) {
    const self = this;
    return {
      on(ev: string, filter: any, cb: Function) {
        self.listeners.push({ table: filter.table || filter, filter, cb });
        return this;
      },
      subscribe() { return this; },
      unsubscribe() { return this; },
    };
  }
}

export default FakeSupabase;
