export default function Loading() {
  return (
    <section className="db-panel cast skeleton" aria-busy="true">
      <div className="db-panel-head">&nbsp;</div>
      <div className="db-panel-body">
        <ul className="people">
          {[0, 1, 2].map((row) => (
            <li className="person" key={row}>
              <div className="avatar" />
              <div>
                <span className="bar" />
                <span className="bar" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
