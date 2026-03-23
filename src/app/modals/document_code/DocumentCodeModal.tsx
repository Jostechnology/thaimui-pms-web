import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { DocumentCodeConfig } from "../../type_interface/document_code";

interface DocumentCodeModalProps {
	show: boolean;
	handleClose: () => void;
	onSave: (data: any) => Promise<boolean>;
	editData: {
		gen_number_type: string;
		description: string;
		config?: DocumentCodeConfig;
		isConfigured: boolean;
	} | null;
}

const DocumentCodeModal: React.FC<DocumentCodeModalProps> = ({ show, handleClose, onSave, editData }) => {
	const [prefix, setPrefix] = useState("");
	const [format, setFormat] = useState("");
	const [currentNumber, setCurrentNumber] = useState(0);
	const [previewCode, setPreviewCode] = useState("");
	const [yearBuddhist, setYearBuddhist] = useState<boolean>(true);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});

	const [yearBuffer, setYearBuffer] = useState<number>(543);

	// Format building blocks
	const formatBlocks = [
		{ label: "PREFIX", value: "PREFIX", description: "Your custom prefix" },
		{ label: "YYYY", value: "YYYY", description: "4-digit year (2025)" },
		{ label: "YY", value: "YY", description: "2-digit year (25)" },
		{ label: "MM", value: "MM", description: "2-digit month (01-12)" },
		{ label: "DD", value: "DD", description: "2-digit day (01-31)" },
		{ label: "XXXXXX", value: "XXXXXX", description: "6-digit sequence (000001)" },
		{ label: "XXXXX", value: "XXXXX", description: "5-digit sequence (00001)" },
		{ label: "XXXX", value: "XXXX", description: "4-digit sequence (0001)" },
		{ label: "-", value: "-", description: "Dash separator" },
		{ label: "/", value: "/", description: "Slash separator" },
		{ label: "_", value: "_", description: "Underscore separator" },
	];

	useEffect(() => {
		if (editData?.config) {
			setPrefix(editData.config.gen_number_prefix || "");
			setFormat(editData.config.gen_number_format || "");
			setCurrentNumber(editData.config.gen_number_current || 0);
			setYearBuddhist(editData.config.year_buddhist);
			if (editData.config.year_buddhist) {
				setYearBuffer(543);
			}
		} else {
			// Default format for new configuration
			setPrefix("");
			setFormat("PREFIX-YYYYMM-XXXXXX");
			setCurrentNumber(0);
		}
		setErrors({});
	}, [editData]);

	useEffect(() => {
		if (yearBuddhist) {
			setYearBuffer(543);
		} else {
			setYearBuffer(0);
		}
	}, [yearBuddhist]);

	useEffect(() => {
		generatePreview();
	}, [prefix, format, currentNumber, yearBuffer]);

	const generatePreview = () => {
		if (!format) {
			setPreviewCode("");
			return;
		}

		const now = new Date();
		let preview = format;
        now.setFullYear(now.getFullYear() + yearBuffer)

		// First, temporarily replace escaped characters (prefixed with *) with placeholders
		const escapedChars: { [key: string]: string } = {};
		let placeholderIndex = 0;

		preview = preview.replace(/\*(.)/g, (match, char) => {
			const placeholder = `__ESCAPED_${placeholderIndex}__`;
			escapedChars[placeholder] = char;
			placeholderIndex++;
			return placeholder;
		});

		// Replace format tokens with example values
		preview = preview.replace(/(?<!\*)PREFIX/g, prefix || "DOC");
		preview = preview.replace(/(?<!\*)YYYY/g, now.getFullYear().toString());
		preview = preview.replace(/(?<!\*)YY/g, now.getFullYear().toString().slice(-2));
		preview = preview.replace(/(?<!\*)MM/g, String(now.getMonth() + 1).padStart(2, "0"));
		preview = preview.replace(/(?<!\*)DD/g, String(now.getDate()).padStart(2, "0"));

		// Handle different sequence lengths
		const sequenceMatch = preview.match(/(?<!\*)X+/);
		if (sequenceMatch) {
			const sequenceLength = sequenceMatch[0].length;
			const paddedNumber = String(currentNumber).padStart(sequenceLength, "0");
			preview = preview.replace(/(?<!\*)X+/, paddedNumber);
		}

		// Restore escaped characters
		Object.keys(escapedChars).forEach((placeholder) => {
			preview = preview.replace(placeholder, escapedChars[placeholder]);
		});
        preview = preview.replace(/\*/g, "");
		setPreviewCode(preview);
	};

	const validateForm = (): boolean => {
		const newErrors: { [key: string]: string } = {};

		if (!prefix.trim()) {
			newErrors.prefix = "กรุณากรอก Prefix";
		}

		if (!format.trim()) {
			newErrors.format = "กรุณากรอก Format";
		} else {
			// Check if format contains at least one sequence placeholder
			if (!/X+/.test(format)) {
				newErrors.format = "Format ต้องมี X อย่างน้อย 1 ตัว (เช่น XXXXXX)";
			}
		}

		if (currentNumber < 0) {
			newErrors.currentNumber = "ตัวเลขเริ่มต้นต้องมากกว่าหรือเท่ากับ 0";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		const data = {
			gen_number_type: editData?.gen_number_type,
			gen_number_prefix: prefix,
			gen_number_format: format,
			gen_number_current: currentNumber,
			...(editData?.config?.gen_number_id && {
				gen_number_id: editData.config.gen_number_id,
			}),
			year_buddhist: yearBuddhist,
		};

		try {
			const success = await onSave(data);
			if (success) {
				Swal.fire({
					icon: "success",
					title: "สำเร็จ",
					text: editData?.isConfigured ? "แก้ไขการตั้งค่าสำเร็จ" : "สร้างการตั้งค่าสำเร็จ",
					timer: 1500,
					showConfirmButton: false,
				});
				handleCloseModal();
			} else {
				Swal.fire({
					icon: "error",
					title: "เกิดข้อผิดพลาด",
					text: "ไม่สามารถบันทึกข้อมูลได้",
				});
			}
		} catch (error) {
			console.error("Error saving document code:", error);
			Swal.fire({
				icon: "error",
				title: "เกิดข้อผิดพลาด",
				text: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
			});
		}
	};

	const insertFormatBlock = (block: string) => {
		setFormat((prev) => prev + block);
	};

	const clearFormat = () => {
		setFormat("");
	};

	const handleCloseModal = () => {
		setYearBuffer(543);
		setYearBuddhist(true);
		handleClose();
	};

	return (
		<Modal show={show} onHide={handleCloseModal} size="lg" centered>
			<Modal.Header closeButton>
				<Modal.Title>{editData?.isConfigured ? "แก้ไข" : "สร้าง"}การตั้งค่ารหัสเอกสาร</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div className="mb-4">
					<div className="alert alert-info d-flex align-items-center">
						<i className="bi bi-info-circle fs-2 me-3"></i>
						<div>
							<strong>{editData?.gen_number_type}</strong>
							<div className="text-muted small">{editData?.description}</div>
						</div>
					</div>
				</div>

				{/* Prefix Input */}
				<div className="mb-5">
					<label className="form-label required">Prefix (คำนำหน้า)</label>
					<input
						type="text"
						className={`form-control ${errors.prefix ? "is-invalid" : ""}`}
						value={prefix}
						onChange={(e) => setPrefix(e.target.value.toUpperCase())}
						placeholder="เช่น INV, COST, ORDER"
					/>
					{errors.prefix && <div className="invalid-feedback">{errors.prefix}</div>}
					<div className="form-text">คำนำหน้าที่จะใช้ใน PREFIX ของ format</div>
				</div>

				<div className="form-check form-switch form-check-custom form-check-solid mb-3 mt-3">
					<input
						className="form-check-input"
						type="checkbox"
						id="yearBuddhist"
						checked={yearBuddhist}
						onChange={() => {
							setYearBuddhist((prev) => !prev);
						}}
					/>
					<label className="form-check-label ms-3" htmlFor="yearBuddhist">
						ใช้ปี พ.ศ. หรือไม่
					</label>
				</div>

				{/* Format Builder */}
				<div className="mb-5">
					<label className="form-label required">Format (รูปแบบ)</label>
					<div className="input-group mb-3">
						<input
							type="text"
							className={`form-control ${errors.format ? "is-invalid" : ""}`}
							value={format}
							onChange={(e) => setFormat(e.target.value)}
							placeholder="เช่น PREFIX-YYYYMM-XXXXXX"
						/>
						<button className="btn btn-secondary" type="button" onClick={clearFormat}>
							<i className="bi bi-x-lg"></i> Clear
						</button>
						{errors.format && <div className="invalid-feedback">{errors.format}</div>}
					</div>

					{/* Format Building Blocks */}
					<div className="card card-bordered">
						<div className="card-body">
							<div className="fw-bold mb-3">เลือกส่วนประกอบของ Format:</div>
							<div className="d-flex flex-wrap gap-2">
								{formatBlocks.map((block) => (
									<button
										key={block.value}
										type="button"
										className="btn btn-sm btn-light-primary"
										onClick={() => insertFormatBlock(block.value)}
										title={block.description}
									>
										{block.label}
									</button>
								))}
							</div>
							<div className="form-text mt-3">
								คลิกเพื่อเพิ่มส่วนประกอบลงใน Format หรือพิมพ์เองได้โดยตรง
							</div>
						</div>
					</div>
				</div>

				{/* Format Guide */}
				<div className="mb-5">
					<div className="card card-bordered bg-light">
						<div className="card-body">
							<div className="fw-bold mb-2">คำอธิบายส่วนประกอบ:</div>
							<ul className="mb-0 small">
								<li>
									<code>PREFIX</code> - คำนำหน้าที่กำหนดด้านบน
								</li>
								<li>
									<code>YYYY</code> - ปี 4 หลัก ({new Date().getFullYear() + yearBuffer})
								</li>
								<li>
									<code>YY</code> - ปี 2 หลัก ({(new Date().getFullYear() + yearBuffer) % 100})
								</li>
								<li>
									<code>MM</code> - เดือน 2 หลัก (01-12)
								</li>
								<li>
									<code>DD</code> - วันที่ 2 หลัก (01-31)
								</li>
								<li>
									<code>XXXXXX</code> - เลขลำดับ 6 หลัก (000001)
								</li>
								<li>
									<code>-</code> <code>/</code> <code>_</code> - ตัวคั่น (ใช้ได้ตามต้องการ)
								</li>
								<li>
									<code>*</code> - ใช้หน้าตัวอักษรเพื่อป้องกันการแปลงที่ PREFIX (เช่น <code>*YY</code> = YY,{" "}
									<code>*X</code> = X)
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Current Number */}
				<div className="mb-5">
					<label className="form-label required">Current Number (เลขลำดับปัจจุบัน)</label>
					<input
						type="number"
						className={`form-control ${errors.currentNumber ? "is-invalid" : ""}`}
						value={currentNumber}
						onChange={(e) => setCurrentNumber(parseInt(e.target.value) || 0)}
						min="0"
					/>
					{errors.currentNumber && <div className="invalid-feedback">{errors.currentNumber}</div>}
					<div className="form-text">
						เลขลำดับที่จะใช้สำหรับเอกสารถัดไปจะเป็น{" "}
						<span className="text-primary fw-bold">{currentNumber + 1}</span>
					</div>
				</div>

				{/* Preview */}
				{previewCode && (
					<div className="alert alert-success">
						<div className="fw-bold mb-2">ตัวอย่างรหัสเอกสาร:</div>
						<div className="fs-3 font-monospace">{previewCode}</div>
						<div className="form-text mt-2">นี่คือตัวอย่างรหัสที่จะถูกสร้างขึ้นจากการตั้งค่าปัจจุบัน</div>
					</div>
				)}
			</Modal.Body>
			<Modal.Footer>
				<button type="button" className="btn btn-light" onClick={handleCloseModal}>
					ยกเลิก
				</button>
				<button type="button" className="btn btn-primary" onClick={handleSubmit}>
					<i className="bi bi-check-lg me-2"></i>
					บันทึก
				</button>
			</Modal.Footer>
		</Modal>
	);
};

export default DocumentCodeModal;
