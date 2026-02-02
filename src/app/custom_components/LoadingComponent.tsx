export default function LoadingComponent() {
	return (
		<div
			className="p-5 d-flex align-items-center justify-content-center"
			style={{ backgroundColor: "#f8fafc" }}
		>
			<div className="text-center">
				<div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }}>
					<span className="visually-hidden">กำลังโหลด...</span>
				</div>
				<p className="text-muted fs-5">กำลังโหลดข้อมูล...</p>
			</div>
		</div>
	);
}
