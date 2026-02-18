import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
	QCWorkOrderData,
	QCWorkOrderItem,
} from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import Select from "react-select";
import { SalesOrderSearch } from "../../../type_interface/SalesOrderType";
import {
	getSalesOrderService,
	searchSalesOrderService,
} from "../../../services/salesOrderService";
import { Material } from "../../../type_interface/MaterialType";

type PageMode = "create" | "view" | "edit";

const CreateEditViewQCWorkOrder: React.FC = () => {
	const { qc_workorder_id } = useParams<{ qc_workorder_id: string }>();
	const location = useLocation();
	const navigate = useNavigate();

	const [mode, setMode] = useState<PageMode>("create");
	const [loading, setLoading] = useState(false);

	const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
	const [salesOrders, setSalesOrder] = useState<SalesOrderSearch[]>([]);
	const [searchSalesOrder, setSearchSalesOrder] = useState<string>("");
	const [materialList, setMaterialList] = useState<Material[]>([]);

	// Determine mode based on URL
	useEffect(() => {
		if (location.pathname.includes("/create")) {
			setMode("create");
		} else if (location.pathname.includes("/view")) {
			setMode("view");
		} else if (location.pathname.includes("/edit")) {
			setMode("edit");
		}
	}, [location.pathname]);

	// Load data for view/edit modes
	useEffect(() => {
		if (qc_workorder_id && (mode === "view" || mode === "edit")) {
			loadQCWorkOrder(qc_workorder_id);
		}
	}, [qc_workorder_id, mode]);

	const loadQCWorkOrder = async (id: string) => {
		setLoading(true);
		try {
			// Replace with actual API call
			// const response = await fetch(`/api/qc-workorders/${id}`);
			// const data = await response.json();

			// Mock data for demonstration
			const mockData: QCWorkOrderData = qcWorkData;
			setFormData(mockData);
		} catch (error) {
			console.error("Error loading QC work order:", error);
			alert("Failed to load QC work order");
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof QCWorkOrderData, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleCheckboxChange = (field: keyof QCWorkOrderData) => {
		setFormData((prev) => ({
			...prev,
			[field]: !prev[field as keyof QCWorkOrderData],
		}));
	};

	const addItem = () => {
		const newItem: QCWorkOrderItem = {
			id: Date.now().toString(),
			code: "",
			description: "",
			wll: "",
			quantity: "",
			serialNo: "",
			remark: "",
		};

		setFormData((prev) => ({
			...prev,
			items: [...prev.items, newItem],
		}));
	};

	const removeItem = (itemId: string) => {
		setFormData((prev) => ({
			...prev,
			items: prev.items.filter((item) => item.id !== itemId),
		}));
	};

	const updateItem = (
		itemId: string,
		field: keyof QCWorkOrderItem,
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			items: prev.items.map((item) =>
				item.id === itemId ? { ...item, [field]: value } : item,
			),
		}));
	};

	// ✅ NEW: Handle material selection per row — auto-fills code + description
	const handleSelectMaterial = (itemId: string, option: Material | null) => {
		setFormData((prev) => ({
			...prev,
			items: prev.items.map((item) =>
				item.id === itemId
					? {
							...item,
							code: option?.item_code ?? "",
							description: option?.item_name ?? option?.item_description ?? "",
						}
					: item,
			),
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			if (mode === "create") {
				// ✅ formData.items is fully populated and ready to send
				// await fetch('/api/qc-workorders', {
				//   method: 'POST',
				//   headers: { 'Content-Type': 'application/json' },
				//   body: JSON.stringify(formData)
				// });

				console.log("Creating QC Work Order:", formData);
				alert("QC Work Order created successfully!");
				navigate("/qc-workorders");
			} else if (mode === "edit") {
				// await fetch(`/api/qc-workorders/${qc_workorder_id}`, {
				//   method: 'PUT',
				//   headers: { 'Content-Type': 'application/json' },
				//   body: JSON.stringify(formData)
				// });

				console.log("Updating QC Work Order:", formData);
				alert("QC Work Order updated successfully!");
				navigate(`/qc-workorders/view/${qc_workorder_id}`);
			}
		} catch (error) {
			console.error("Error saving QC work order:", error);
			alert("Failed to save QC work order");
		} finally {
			setLoading(false);
		}
	};

	const handleSearchSalesOrder = async () => {
		const res = await searchSalesOrderService(searchSalesOrder);
		setSalesOrder(res.data);
	};

	const switchToEditMode = () => {
		navigate(`/qc-workorders/edit/${qc_workorder_id}`);
	};

	const isReadOnly = mode === "view";

	useEffect(() => {
		if (!searchSalesOrder) return;

		const timeout = setTimeout(() => {
			handleSearchSalesOrder();
		}, 750);

		return () => {
			clearTimeout(timeout);
		};
	}, [searchSalesOrder]);

	const handleClickedSalesOrder = async (option: any) => {
		if (option) {
			const doc_entry: number = option.doc_entry;
			setFormData((prev: any) => ({
				...prev,
				donEntry: doc_entry,
			}));

			const res = await getSalesOrderService(doc_entry);
			const data = res.data;

			setFormData((prev) => ({
				...prev,
				customerCode: data.card_code,
				customerName: data.card_name,
				docNum: data.doc_num,
				docEntry: data.doc_entry,
				salesCode: data.slp_code,
				salesName: data.slp_name,
				teamCode: data.group_code,
				teamName: data.group_name,
			}));

			setMaterialList(data.material_list);
			setSearchSalesOrder(option.doc_entry);
		} else {
			setFormData(qcWorkData);
			setSearchSalesOrder("");
			setMaterialList([]);
		}
	};

	return (
		<div className="container-fluid py-4">
			<div className="card">
				<div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
					<h4 className="mb-0">
						{mode === "create" && "Create QC Work Order"}
						{mode === "view" && "View QC Work Order"}
						{mode === "edit" && "Edit QC Work Order"}
					</h4>
					{mode === "view" && (
						<button className="btn btn-light btn-sm" onClick={switchToEditMode}>
							<i className="bi bi-pencil"></i> Edit
						</button>
					)}
				</div>

				<div className="card-body">
					{loading ? (
						<div className="text-center py-5">
							<div className="spinner-border text-primary" role="status">
								<span className="visually-hidden">Loading...</span>
							</div>
						</div>
					) : (
						<form onSubmit={handleSubmit}>
							{/* Header Section */}
							<div className="row mb-4">
								<div className="col-md-12 text-center mb-3">
									<h5 className="fw-bold">ใบสั่งงาน QC</h5>
								</div>
							</div>

							{/* Basic Information */}
							<div className="row mb-3">
								<div className="col-md-2">
									<label className="form-label">วันที่</label>
									<input
										type="date"
										className="form-control"
										value={formData.date}
										onChange={(e) => handleInputChange("date", e.target.value)}
										disabled
									/>
								</div>
								<div className="col-md-4">
									<label className="form-label">พนักงานขาย</label>
									<input
										type="text"
										className="form-control"
										value={formData.salesName}
										disabled
									/>
								</div>
								<div className="col-md-4">
									<label className="form-label">ทีม</label>
									<input
										type="text"
										className="form-control"
										value={formData.teamName}
										disabled
									/>
								</div>
								<div className="col-md-2">
									<label className="form-label">เลขที่</label>
									<input
										type="text"
										className="form-control"
										value={formData.documentNumber}
										onChange={(e) =>
											handleInputChange("documentNumber", e.target.value)
										}
										disabled
									/>
								</div>
							</div>

							{/* Customer Information */}
							<div className="row mb-3">
								<div className="col-md-12">
									<label className="form-label">ชื่อลูกค้า/รหัส</label>
									<div className="input-group">
										<input
											type="text"
											className="form-control"
											value={formData.customerCode}
											placeholder="รหัสลูกค้า"
											disabled
										/>
										<input
											type="text"
											className="form-control"
											value={formData.customerName}
											placeholder="ชื่อลูกค้า"
											disabled
										/>
									</div>
								</div>
							</div>

							<div className="row mb-3">
								<div className="col-md-6">
									<label className="form-label">ใบสั่งขายเลขที่</label>
									<Select
										options={salesOrders}
										formatOptionLabel={(option: any) => (
											<div className="d-flex align-items-center gap-2">
												<span>{option.doc_entry}</span>
											</div>
										)}
										getOptionValue={(option) => option.doc_entry}
										value={
											salesOrders.find(
												(op) => op.doc_entry === formData.donEntry,
											) || null
										}
										onInputChange={(inputValue, actionMeta) => {
											if (actionMeta.action === "input-change") {
												setSearchSalesOrder(inputValue);
											}
										}}
										onChange={(option: any) => {
											handleClickedSalesOrder(option);
										}}
										placeholder="ค้นหาใบสั่งขาย..."
										isClearable
										isDisabled={isReadOnly}
									/>
								</div>

								<div className="col-md-3">
									<label className="form-label">วันที่ย้าย</label>
									<input
										type="text"
										className="form-control"
										value={formData.customerReceiptNumber}
										onChange={(e) =>
											handleInputChange("customerReceiptNumber", e.target.value)
										}
										disabled={isReadOnly}
									/>
								</div>

								<div className="col-md-3">
									<label className="form-label">วันที่ส่ง</label>
									<input
										type="text"
										className="form-control"
										value={formData.customerReceiptNumber}
										onChange={(e) =>
											handleInputChange("customerReceiptNumber", e.target.value)
										}
										disabled={isReadOnly}
									/>
								</div>
							</div>

							{/* Testing Standards Section */}
							<div className="row mb-3">
								<div className="col-md-12">
									<label className="form-label fw-bold">มาตรฐาน</label>
									<div className="row">
										{(
											[
												["ptt", "PTT"],
												["chevron", "Chevron"],
												["valeur", "Valeur"],
												["ophir", "Ophir"],
												["threeSpec", "3Spec"],
											] as [keyof QCWorkOrderData, string][]
										).map(([field, label]) => (
											<div className="col-md-2" key={field}>
												<div className="form-check">
													<input
														className="form-check-input"
														type="checkbox"
														checked={!!formData[field]}
														onChange={() => handleCheckboxChange(field)}
														disabled={isReadOnly}
													/>
													<label className="form-check-label">{label}</label>
												</div>
											</div>
										))}
										<div className="col-md-2">
											<div className="form-check">
												<input
													className="form-check-input"
													type="checkbox"
													checked={formData.standardOthers}
													onChange={() => handleCheckboxChange("standardOthers")}
													disabled={isReadOnly}
												/>
												<label className="form-check-label">Others</label>
											</div>
											{formData.standardOthers && (
												<input
													type="text"
													className="form-control form-control-sm mt-1"
													value={formData.standardOthersText}
													onChange={(e) =>
														handleInputChange("standardOthersText", e.target.value)
													}
													placeholder="ระบุ"
													disabled={isReadOnly}
												/>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Testing Type / Certificate Section */}
							<div className="row mb-3">
								<div className="col-md-12">
									<label className="form-label fw-bold">ใบรับรอง</label>
									<div className="row">
										{(
											[
												["inHouse", "In-house"],
												["thirdParty", "Third Party"],
												["ndt", "NDT"],
											] as [keyof QCWorkOrderData, string][]
										).map(([field, label]) => (
											<div className="col-md-2" key={field}>
												<div className="form-check">
													<input
														className="form-check-input"
														type="checkbox"
														checked={!!formData[field]}
														onChange={() => handleCheckboxChange(field)}
														disabled={isReadOnly}
													/>
													<label className="form-check-label">{label}</label>
												</div>
											</div>
										))}
										<div className="col-md-2">
											<div className="form-check">
												<input
													className="form-check-input"
													type="checkbox"
													checked={formData.testingOthers}
													onChange={() => handleCheckboxChange("testingOthers")}
													disabled={isReadOnly}
												/>
												<label className="form-check-label">Others</label>
											</div>
											{formData.testingOthers && (
												<input
													type="text"
													className="form-control form-control-sm mt-1"
													value={formData.testingOthersText}
													onChange={(e) =>
														handleInputChange("testingOthersText", e.target.value)
													}
													placeholder="ระบุ"
													disabled={isReadOnly}
												/>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Serial Number Section */}
							<div className="row mb-3">
								<div className="col-md-12">
									<label className="form-label fw-bold">Serial Number</label>
									<div className="row">
										{(
											[
												["continueSerial", "คล้องวางแห"],
												["serialImprint", "ตอกที่ตัวสินค้า"],
												["serialTag", "คล้องแท็ก"],
											] as [keyof QCWorkOrderData, string][]
										).map(([field, label]) => (
											<div className="col-md-3" key={field}>
												<div className="form-check">
													<input
														className="form-check-input"
														type="checkbox"
														checked={!!formData[field]}
														onChange={() => handleCheckboxChange(field)}
														disabled={isReadOnly}
													/>
													<label className="form-check-label">{label}</label>
												</div>
											</div>
										))}
										<div className="col-md-3">
											<div className="form-check">
												<input
													className="form-check-input"
													type="checkbox"
													checked={formData.serialOthers}
													onChange={() => handleCheckboxChange("serialOthers")}
													disabled={isReadOnly}
												/>
												<label className="form-check-label">Others</label>
											</div>
											{formData.serialOthers && (
												<input
													type="text"
													className="form-control form-control-sm mt-1"
													value={formData.serialOthersText}
													onChange={(e) =>
														handleInputChange("serialOthersText", e.target.value)
													}
													placeholder="ระบุ"
													disabled={isReadOnly}
												/>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Remark Section */}
							<div className="row mb-3">
								<div className="col-md-12">
									<label className="form-label fw-bold">Remark</label>
									<textarea
										className="form-control"
										rows={2}
										value={formData.generalRemark}
										onChange={(e) =>
											handleInputChange("generalRemark", e.target.value)
										}
										disabled={isReadOnly}
									/>
								</div>
							</div>

							<div className="row mb-3">
								<div className="col-md-12">
									<label className="form-label fw-bold">รายละเอียดการเทส</label>
									<textarea
										className="form-control"
										rows={5}
										value={formData.details}
										onChange={(e) =>
											handleInputChange("details", e.target.value)
										}
										disabled={isReadOnly}
									/>
								</div>
							</div>

							{/* ✅ Items Table — fully functional */}
							<div className="row mb-3">
								<div className="col-md-12">
									<div className="d-flex justify-content-between align-items-center mb-2">
										<h6 className="fw-bold mb-0">รายการสินค้า</h6>
										{!isReadOnly && (
											<button
												type="button"
												className="btn btn-success btn-sm"
												onClick={addItem}
											>
												<i className="bi bi-plus-circle"></i> Add Item
											</button>
										)}
									</div>

									<div className="table-responsive">
										<table className="table table-bordered table-sm">
											<thead className="table-light">
												<tr>
													<th style={{ width: "15%" }}>รหัสสินค้า</th>
													<th style={{ width: "25%" }}>รายละเอียด</th>
													<th style={{ width: "10%" }}>WLL</th>
													<th style={{ width: "10%" }}>จำนวน</th>
													<th style={{ width: "15%" }}>Serial No</th>
													<th style={{ width: "15%" }}>หมายเหตุ</th>
													{!isReadOnly && (
														<th style={{ width: "5%" }}>Action</th>
													)}
												</tr>
											</thead>
											<tbody>
												{formData.items.map((item) => (
													<tr key={item.id}>
														{/* ✅ Material selector — scoped to this row */}
														<td>
															{isReadOnly ? (
																<span className="form-control-plaintext px-2">
																	{item.code}
																</span>
															) : (
																<Select
																	isDisabled={materialList.length < 1}
																	options={materialList}
																	formatOptionLabel={(option: Material) => (
																		<div>{option.item_code}</div>
																	)}
																	getOptionValue={(option) => option.item_code}
																	// ✅ Controlled: reflect current item.code
																	value={
																		materialList.find(
																			(m) => m.item_code === item.code,
																		) || null
																	}
																	onChange={(option: Material | null) => {
																		handleSelectMaterial(item.id, option);
																	}}
																	placeholder="ค้นหารหัส..."
																	isClearable
																	menuPortalTarget={document.body}
																	styles={{
																		menuPortal: (base) => ({
																			...base,
																			zIndex: 9999,
																		}),
																	}}
																/>
															)}
														</td>

														{/* ✅ Description — auto-filled, but still editable */}
														<td>
															<input
																type="text"
																className="form-control form-control-sm"
																value={item.description}
																onChange={(e) =>
																	updateItem(
																		item.id,
																		"description",
																		e.target.value,
																	)
																}
																placeholder="รายละเอียด"
																disabled
															/>
														</td>

														<td>
															<input
																type="text"
																className="form-control form-control-sm"
																value={item.wll}
																onChange={(e) =>
																	updateItem(item.id, "wll", e.target.value)
																}
																disabled={isReadOnly}
															/>
														</td>
														<td>
															<input
																type="number"
																min={0}
																className="form-control form-control-sm"
																value={item.quantity}
																onChange={(e) =>
																	updateItem(
																		item.id,
																		"quantity",
																		e.target.value,
																	)
																}
																disabled={isReadOnly}
															/>
														</td>
														<td>
															<input
																type="text"
																className="form-control form-control-sm"
																value={item.serialNo}
																onChange={(e) =>
																	updateItem(
																		item.id,
																		"serialNo",
																		e.target.value,
																	)
																}
																disabled={isReadOnly}
															/>
														</td>
														<td>
															<input
																type="text"
																className="form-control form-control-sm"
																value={item.remark}
																onChange={(e) =>
																	updateItem(item.id, "remark", e.target.value)
																}
																disabled={isReadOnly}
															/>
														</td>
														{!isReadOnly && (
															<td className="text-center">
																<button
																	type="button"
																	className="btn btn-danger btn-sm"
																	onClick={() => removeItem(item.id)}
																>
																	<i className="bi bi-trash"></i>
																</button>
															</td>
														)}
													</tr>
												))}
												{formData.items.length === 0 && (
													<tr>
														<td
															colSpan={isReadOnly ? 6 : 7}
															className="text-center text-muted py-3"
														>
															No items added yet
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="row">
								<div className="col-md-12">
									<div className="d-flex gap-2 justify-content-end">
										<button
											type="button"
											className="btn btn-secondary"
											onClick={() => navigate("/qc-workorders")}
										>
											{mode === "view" ? "Close" : "Cancel"}
										</button>
										{!isReadOnly && (
											<button
												type="submit"
												className="btn btn-primary"
												disabled={loading}
											>
												{loading ? (
													<>
														<span
															className="spinner-border spinner-border-sm me-2"
															role="status"
															aria-hidden="true"
														></span>
														Saving...
													</>
												) : mode === "create" ? (
													"Create"
												) : (
													"Update"
												)}
											</button>
										)}
									</div>
								</div>
							</div>
						</form>
					)}
				</div>
			</div>

			<style>{`
        .form-label {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .table-bordered th,
        .table-bordered td {
          vertical-align: middle;
        }
        .form-control-sm {
          font-size: 0.875rem;
        }
        .form-check-input {
          cursor: pointer;
        }
        .form-check-label {
          cursor: pointer;
        }
        .card {
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .form-control-plaintext {
          font-size: 0.875rem;
        }
      `}</style>
		</div>
	);
};

export default CreateEditViewQCWorkOrder;