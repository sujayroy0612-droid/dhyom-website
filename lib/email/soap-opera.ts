export type SoapOperaEmailRow = {
  id: string;
  day_number: number;
  variant: string;
  subject: string;
  preview_text: string;
  body_html: string;
  body_text: string;
};

export function emailWrapper(previewText: string, body: string, unsub: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#1A0A14;font-family:Georgia,serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <div style="max-width:480px;margin:40px auto;background:#3D1428;border-radius:4px;overflow:hidden;">
    <div style="padding:36px 36px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4A373;">Dhyom</p>
      <div style="width:28px;height:1px;background:rgba(196,163,115,0.35);margin-bottom:28px;"></div>
    </div>
    <div style="padding:0 36px 36px;">
      ${body}
      <div style="border-top:1px solid rgba(196,163,115,0.18);padding-top:20px;margin-top:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:0;">
          <tr>
            <td>
              <p style="margin:0 0 3px;font-size:13px;letter-spacing:2px;color:#C4A373;">— SUJAY</p>
              <p style="margin:0;font-size:10px;letter-spacing:2px;color:rgba(196,163,115,0.50);text-transform:uppercase;">Founder, Dhyom</p>
            </td>
            <td style="text-align:right;vertical-align:bottom;">
              <a href="${unsub}" style="font-size:10px;color:rgba(245,237,224,0.22);text-decoration:none;letter-spacing:0.5px;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function renderEmail(
  row: SoapOperaEmailRow,
  name: string,
  unsubUrl: string
): { subject: string; html: string; text: string } {
  const display = name || "there";
  const bodyHtml = row.body_html.replace(/\{\{name\}\}/g, display);
  const bodyText = row.body_text
    .replace(/\{\{name\}\}/g, display)
    .replace(/\{\{unsub_url\}\}/g, unsubUrl);
  return {
    subject: row.subject,
    html: emailWrapper(row.preview_text, bodyHtml, unsubUrl),
    text: bodyText,
  };
}
