import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Paso2() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<any[]>([]);

  useEffect(() => {
    const s1 = JSON.parse(localStorage.getItem("step1") || "{}");
    const list = Array.from({ length: s1.count || 1 }).map(() => ({
      firstName: "",
      lastName: "",
      dni: "",
      age: 0,
      relation: "",
      diet: "ninguna",
      sex: "X",
      isPrimary: false
    }));
    setAttendees(list);
  }, []);

  function submit(e: any) {
    e.preventDefault();
    localStorage.setItem("step2", JSON.stringify(attendees));
    router.push("/inscripcion/paso-3");
  }

  return (
    <Layout title="Inscripción – Paso 2">
      <form onSubmit={submit}>
        {attendees.map((a, i) => (
          <div className="card" key={i}>
            <h3>Persona #{i + 1}</h3>
            <div className="grid2">
              <input placeholder="Nombre" required
                onChange={e => a.firstName = e.target.value} />
              <input placeholder="Apellido" required
                onChange={e => a.lastName = e.target.value} />
              <input placeholder="DNI" required
                onChange={e => a.dni = e.target.value} />
              <input type="number" placeholder="Edad" required
                onChange={e => a.age = +e.target.value} />
              <input placeholder="Relación" required
                onChange={e => a.relation = e.target.value} />
              <select onChange={e => a.diet = e.target.value}>
                <option value="ninguna">Ninguna</option>
                <option value="celiaco">Celíaco</option>
                <option value="vegetariano">Vegetariano</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <label>
              <input type="radio" name="primary" onChange={() =>
                attendees.forEach((x, j) => x.isPrimary = i === j)
              } /> Familiar principal
            </label>
          </div>
        ))}
        <button className="btn">Continuar</button>
      </form>
    </Layout>
  );
}
