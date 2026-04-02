import { getServiceBadgeClass, getServiceIcon } from '../utils/serviceHelpers';

export default function ServicesPanel({ services = [] }) {
  return (
    <div className="oc show" id="oc1">
      <div className="och">
        <div className="cdot dg2"></div>
        <h4>AWS Services Selected</h4>
        <span className="ocm">{services.length} services</span>
      </div>
      <div className="sb">
        {services.map((svc, i) => (
          <div key={i} className="sr">
            <span className={`sbadge ${getServiceBadgeClass(svc.name)}`}>
              {getServiceIcon(svc.name)}
            </span>
            <div className="sdesc">
              <strong>{svc.name}</strong>
              <span>
                {svc.role}.{' '}
                <span style={{ color: 'rgba(0,240,180,.65)' }}>{svc.justification}</span>
              </span>
              {svc.data_flow && <div className="sflow">{svc.data_flow}</div>}
              <div className="scost">💰 {svc.estimated_monthly_cost || '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
