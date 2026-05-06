import React, { useEffect, useState } from "react";

function ApplyPage({ jobId }) {
    const [applies, setApplies] = useState([]);

    useEffect(() => {
        fetch(`http://localhost:8081/apply/${jobId}`)
            .then((res) => res.json())
            .then((data) => setApplies(data));
    }, [jobId]);

    const approve = (id) => {
        fetch(`http://localhost:8081/apply/approve/${id}`, {
            method: "POST",
        })
            .then(() => alert("승인 완료"))
            .then(() => window.location.reload());
    };

    return (
        <div>
            <h3>지원자 목록</h3>

            {applies.map((a) => (
                <div key={a.id}>
                    <p>{a.workerName}</p>
                    <p>{a.status}</p>

                    {a.status === "PENDING" && (
                        <button onClick={() => approve(a.id)}>승인</button>
                    )}

                    <hr />
                </div>
            ))}
        </div>
    );
}

export default ApplyPage;