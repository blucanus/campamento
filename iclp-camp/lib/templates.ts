export const CAMP_DATES_TEXT = "6, 7 y 8 de marzo de 2026";

export function mailPending({ fullName, attendeesCount }: { fullName: string; attendeesCount: number }) {
  return {
    subject: "Inscripción registrada - Pago pendiente | Campamento ICLP",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Inscripción registrada ✅</h2>
        <p>Hola <b>${fullName}</b>, registramos los datos de tu inscripción para el campamento (${CAMP_DATES_TEXT}).</p>
        <p><b>Estado del pago:</b> <b>Pendiente de confirmación</b>.</p>
        <p>Cuando se confirme el pago, te vamos a enviar un email con la confirmación.</p>
        <p><b>Importante:</b> antes de la fecha del campamento te va a llegar la información de la <b>habitación</b> y <b>cama</b> asignadas.</p>
        <hr/>
        <p><b>Integrantes cargados:</b> ${attendeesCount}</p>
      </div>
    `
  };
}

export function mailApproved({ fullName, attendeesCount }: { fullName: string; attendeesCount: number }) {
  return {
    subject: "Pago confirmado ✅ | Campamento ICLP",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Pago confirmado ✅</h2>
        <p>Hola <b>${fullName}</b>, ¡se confirmó el pago de tu inscripción para el campamento (${CAMP_DATES_TEXT})!</p>
        <p><b>Estado del pago:</b> <b>Confirmado</b>.</p>
        <p><b>Importante:</b> antes de la fecha del campamento te va a llegar la información de la <b>habitación</b> y <b>cama</b> asignadas.</p>
        <hr/>
        <p><b>Integrantes:</b> ${attendeesCount}</p>
      </div>
    `
  };
}
