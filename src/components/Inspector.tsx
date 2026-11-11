import { EMBED, runAgain, useCalls } from '../lib/api'

const kb = (n: number | null) => (n == null ? '…' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} kB` : `${(n / 1048576).toFixed(1)} MB`)

/** Live list of every HTTP request this page made. In embed mode: a one-line ticker. */
export default function Inspector({ page }: { page: string }) {
  const all = useCalls()
  const calls = all.filter((c) => c.page === page)
  if (EMBED) {
    const c = calls[0]
    return (
      <div className="ticker" data-testid="api-ticker" title={c?.url}>
        API · {c ? <><span className={c.ok == null ? 'faint' : c.ok ? 'ok' : 'bad'}>{c.status ?? '…'}</span> GET {c.url.replace(/^https?:\/\//, '')} · {c.ms ?? '…'} ms</> : 'waiting for the first call…'} · {calls.filter((x) => x.ok).length} ok
      </div>
    )
  }
  return (
    <section className="card" aria-labelledby="insp-h" data-testid="inspector">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="insp-h" style={{ fontSize: 16 }}>API inspector <span className="faint small">— every request this page made</span></h2>
        <button className="btn" onClick={runAgain} data-testid="run-again">↻ Run again</button>
      </div>
      <div className="scroll" style={{ marginTop: 10 }}>
        <table>
          <thead><tr><th>Method</th><th>URL</th><th className="r">Status</th><th className="r">Size</th><th className="r">Time</th><th /></tr></thead>
          <tbody>
            {!calls.length && <tr><td colSpan={6} className="faint">No calls yet.</td></tr>}
            {calls.map((c) => (
              <tr key={c.id} data-testid="api-call" data-ok={String(c.ok)}>
                <td className="num">{c.method}</td>
                <td className="num" style={{ wordBreak: 'break-all', fontSize: 12 }}>{c.url}</td>
                <td className={`num r ${c.ok == null ? 'faint' : c.ok ? 'ok' : 'bad'}`}>{c.status ?? (c.ok === false ? 'failed' : '…')}</td>
                <td className="num r">{kb(c.size)}</td>
                <td className="num r">{c.ms == null ? '…' : `${c.ms} ms`}</td>
                <td><a href={c.url} target="_blank" rel="noreferrer" className="small">Open JSON</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
