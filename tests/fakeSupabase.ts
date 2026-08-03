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

  // simple helper to clone rows
  clone(row: any) {
    return JSON.parse(JSON.stringify(row));
  }

  from(table: string) {
    const self = this;
    const chain: any = {
      table,
      filters: {},
      select(selectStr?: string) {
        this._select = true;
        this._selectStr = selectStr;
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
      then(cb: (value: { data: any; error: null }) => { data: any; error: null } | PromiseLike<{ data: any; error: null }>) {
        const rows = this._apply();
        return Promise.resolve({ data: rows, error: null }).then(cb);
      },
      select_head_count() {
        const rows = this._apply();
        return Promise.resolve({ count: rows.length, error: null });
      },
      delete() {
        const rows = this._apply();
        // remove matching rows
        const before = self.tables[table].length;
        self.tables[table] = self.tables[table].filter((r) => !this._matches(r));
        this._notify(table, 'DELETE');
        return Promise.resolve({ data: null, error: null });
      },
      insert(rows: any[]) {
        rows.forEach((r: any) => {
          const clone = self.clone(r);
          // simple primary key handling
          if (!clone.id) clone.id = Math.random().toString(36).slice(2, 10);
          self.tables[table].push(clone);
        });
        this._notify(table, 'INSERT');
        return Promise.resolve({ data: rows, error: null });
      },
      update(obj: any) {
        self.tables[table].forEach((r) => {
          if (this._matches(r)) Object.assign(r, obj);
        });
        this._notify(table, 'UPDATE');
        return Promise.resolve({ data: null, error: null });
      },
      upsert(rows: any[], opts?: any) {
        rows.forEach((r: any) => {
          // if primary key player_id
          const pk = r.player_id ?? r.id;
          const existing = self.tables[table].find((x) => (pk ? (x.player_id === pk || x.id === pk) : false));
          if (existing) Object.assign(existing, r);
          else self.tables[table].push(self.clone(r));
        });
        this._notify(table, 'UPSERT');
        return Promise.resolve({ data: rows, error: null });
      },
      select_count(opts?: any) {
        const rows = this._apply();
        return Promise.resolve({ count: rows.length, error: null });
      },
      _apply() {
        let rows = self.tables[table] || [];
        rows = rows.filter((r) => this._matches(r));
        if (this._order) rows = [...rows].sort((a: any, b: any) => a[this._order.field] - b[this._order.field]);
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
