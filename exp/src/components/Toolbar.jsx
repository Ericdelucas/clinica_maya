import React from 'react';

export default function Toolbar({ title = 'Clinica Maya', subtitle = 'Area segura' }) {
  return (
    <div className="maya-topbar">
      <div className="maya-brand-lockup compact">
        <div className="maya-logo-mark">M</div>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
