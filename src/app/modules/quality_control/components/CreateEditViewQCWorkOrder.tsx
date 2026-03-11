import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import TestResultSection from "./TestResultSection";
import {
	QCWorkOrderData,
	QCWorkOrderItem,
} from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import Select from "react-select";
import {
	getSalesOrderService,
	searchSalesOrderService,
	getSalesItemsFromSalesOrder,
} from "../../../services/salesOrderService";
import { Material } from "../../../type_interface/MaterialType";
import { createQCWorkOrder, updateQCWorkOrder, getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import Swal from "sweetalert2";
import { generateQCWorkOrderPDF } from "../../../utils/generateQCWorkOrderPDF";

type PageMode = "create" | "view" | "edit";

const CreateEditViewQCWorkOrder: React.FC = () => {
	const { qc_workorder_id } = useParams<{ qc_workorder_id: string }>();
	const location = useLocation();
	const navigate = useNavigate();

	const [mode, setMode] = useState<PageMode>("create");
	const [loading, setLoading] = useState(false);
	const [pdfLoading, setPdfLoading] = useState(false);

	const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
	const [salesOrders, setSalesOrders] = useState<any[]>([]);
	const [searchSalesOrder, setSearchSalesOrder] = useState<string>("");
	const [salesItems, setSalesItems] = useState<any[]>([]);
	const [searchSalesItem, setSearchSalesItem] = useState<string>("");
	const [materialList, setMaterialList] = useState<Material[]>([]);

	const printRef = useRef<HTMLDivElement>(null);
	const [isFirstLoad, setIsFirstLoad] = useState<boolean>(false)
	const [testResults, setTestResults] = useState<any[]>([])

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
			const result = await getQCWorkOrderById(Number(id));
			if (result.success && result.data) {
				const raw = result.data;
				const form = raw.qc_form || {};
				const items = (raw.qc_items || []).map((item: any) => ({
					id: String(item.qc_item_id),
					code: item.item_code ?? "",
					description: item.description ?? "",
					wll: item.wll ?? "",
					quantity: item.quantity ?? "",
					serialNo: item.serial_no ?? "",
					remark: item.item_remark ?? "",
					material_list_id: item.material_list_id ?? undefined,
				}));

				const formDataToSet = {
					...qcWorkData,
					// QCWorkOrder fields
					work_order_id: raw.work_order_id,
					// QCForm fields — map snake_case → camelCase
					ptt: form.std_ptt ?? false,
					chevron: form.std_chevron ?? false,
					valeur: form.std_valeur ?? false,
					ophir: form.std_ophir ?? false,
					threeSpec: form.std_three_spec ?? false,
					standardOthers: form.std_others ?? false,
					standardOthersText: form.std_others_text ?? "",
					inHouse: form.cert_inhouse ?? false,
					thirdParty: form.cert_third_party ?? false,
					ndt: form.cert_ndt ?? false,
					testingOthers: form.cert_others ?? false,
					testingOthersText: form.cert_others_text ?? "",
					serialTag: form.serial_tag ?? false,
					serialImprint: form.serial_imprint ?? false,
					continueSerial: form.serial_continue ?? false,
					serialOthers: form.serial_others ?? false,
					serialOthersText: form.serial_others_text ?? "",
					generalRemark: form.general_remark ?? "",
					details: form.details ?? "",
					customerReceiptNumber: form.customer_receipt_number ?? "",
					docEntry: raw.doc_entry ?? "",          // ← ใช้ doc_entry ที่ backend ส่งใหม่
					salesItemId: raw.sales_item_id ?? undefined,
					salesItemCode: raw.sales_item_code ?? "",
					quantity: raw.quantity ?? 1,
					items,
				};

				setFormData(formDataToSet);
				setTestResults(raw.test_results)

				if (formDataToSet.docEntry) {
					try {
						const salesRes = await getSalesOrderService(Number(formDataToSet.docEntry));
						if (salesRes && salesRes.data) {
							setIsFirstLoad(true)
							const data = salesRes.data;
							setSalesOrders([data]);  // ให้ dropdown SO แสดงค่าที่เลือกใน view/edit
							setFormData((prev: any) => ({
								...prev,
								customerCode: data.card_code,
								customerName: data.card_name,
								docNum: data.doc_num,
								salesCode: data.slp_code,
								salesName: data.slp_name,
								teamCode: data.group_code,
								teamName: data.group_name,
							}));
							// โหลด sales items เพื่อให้แสดงชื่อสินค้าใน select
							setSalesItems(data.items);
							setMaterialList(data?.material_list || []);
							
						}
					} catch (e) {
						console.error("Failed to fetch sales order for QC Work Order", e);
					}
				}

			} else {
				Swal.fire("ผิดพลาด!", result.message || "ไม่พบข้อมูล QC Work Order", "error");
			}
		} catch (error) {
			console.error("Error loading QC work order:", error);
			Swal.fire("ผิดพลาด!", "ไม่สามารถโหลดข้อมูลได้", "error");
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
	const handleSelectMaterial = (itemId: string, option: Material | null) => {
		setFormData((prev) => ({
			...prev,
			items: prev.items.map((item) =>
				item.id === itemId
					? {
						...item,
						code: option?.item_code ?? "",
						description: option?.item_name ?? option?.item_description ?? "",
						material_list_id: option?.material_list_id ?? undefined,
					}
					: item,
			),
		}));
	};

	const getMateriakInFormData = (itemId : string) => {
		const item = formData.items.find((prev) => prev.id === itemId)
		const material = materialList.find((ml) => ml.material_list_id == item?.material_list_id)
		return material
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			if (mode === "create") {
				const result = await createQCWorkOrder(formData);
				if (result.success) {
					Swal.fire("สำเร็จ!", "สร้าง QC Work Order เรียบร้อยแล้ว", "success");
					navigate("/quality_control/qc_workorders_list");
				} else {
					Swal.fire("ผิดพลาด!", result.message || "ไม่สามารถสร้างข้อมูลได้", "error");
				}
			} else if (mode === "edit") {
				const result = await updateQCWorkOrder(Number(qc_workorder_id), formData);
				if (result.success) {
					Swal.fire("สำเร็จ!", "แก้ไข QC Work Order เรียบร้อยแล้ว", "success");
					navigate("/quality_control/qc_workorders_list");
				} else {
					Swal.fire("ผิดพลาด!", result.message || "ไม่สามารถแก้ไขข้อมูลได้", "error");
				}
			}
		} catch (error) {
			console.error("Error saving QC work order:", error);
			Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
		} finally {
			setLoading(false);
		}
	};


	const switchToEditMode = () => {
		navigate(`/quality_control/qc_workorders_list/edit/${qc_workorder_id}`);
	};

	const handleExportPDF = async () => {
		setPdfLoading(true);
		try {
			await generateQCWorkOrderPDF(formData, qc_workorder_id);
		} catch (err) {
			console.error("PDF export error:", err);
			Swal.fire("ผิดพลาด!", "ไม่สามารถ export PDF ได้", "error");
		} finally {
			setPdfLoading(false);
		}
	};

	const isReadOnly = mode === "view";

	// Debounce search Sales Order
	useEffect(() => {
		if (isReadOnly) {
			return
		}
		const timeout = setTimeout(async () => {
			const res = await searchSalesOrderService(searchSalesOrder);
			if (res && res.data) setSalesOrders(res.data.items);
		}, 750);
		return () => clearTimeout(timeout);
	}, [searchSalesOrder]);

	const handleClickedSalesOrder = async (option: any) => {
		if (option) {
			try {
				const res = await getSalesOrderService(Number(option.doc_entry));
				if (res && res.data) {
					const data = res.data;
					setFormData((prev: any) => ({
						...prev,
						docEntry: data.doc_entry,
						customerCode: data.card_code,
						customerName: data.card_name,
						docNum: data.doc_num,
						salesCode: data.slp_code,
						salesName: data.slp_name,
						teamCode: data.group_code,
						teamName: data.group_name,
						salesItemId: undefined, // reset item selection
					}));
					// โหลด sales items ของ SO นี้
					setSalesItems(data.items || []);
					setMaterialList(data.material_list);
				}
			} catch (e) {
				console.error("Failed to fetch sales order info", e);
			}
		} else {
			setFormData(qcWorkData);
			setSearchSalesOrder("");
			setSalesItems([]);
			setMaterialList([]);
			setFormData((prev: any) => ({
				...prev,
				salesItemId: undefined, // reset item selection
			}));
		}
	};

	return (
		<div className="container-fluid py-4">
			<div className="card">
				<div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
					
					{mode === "view" && (
						<div className="d-flex gap-2">
							<button
								className="btn btn-danger btn-sm"
								onClick={handleExportPDF}
								disabled={pdfLoading}
							>
								{pdfLoading ? (
									<><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> กำลัง Export...</>
								) : (
									<><i className="bi bi-file-earmark-pdf me-1"></i> Export PDF</>
								)}
							</button>
							<button className="btn btn-light btn-sm" onClick={switchToEditMode}>
								<i className="bi bi-pencil"></i> Edit
							</button>
						</div>
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
									<h5 className="fw-bold">ใบสั่งเทส</h5>
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
								<div className="col-md-5">
									<label className="form-label">ใบสั่งขายเลขที่</label>
									
									<Select
										options={salesOrders}
										formatOptionLabel={(option: any) => (
											<div className="d-flex align-items-center gap-2">
												<span className="fw-bold">{option.doc_num}</span>
											</div>
										)}
										getOptionValue={(option: any) => String(option.doc_entry)}
										value={
											salesOrders.find(
												(op: any) => op.doc_entry === formData.docEntry
											) || null
										}
										onInputChange={(inputValue, actionMeta) => {
											if (actionMeta.action === "input-change") {
												setSearchSalesOrder(inputValue);
											}
										}}
										onChange={(option: any) => handleClickedSalesOrder(option)}
										filterOption={null}
										placeholder="ค้นหาใบสั่งขาย..."
										isClearable
										isDisabled={isReadOnly}
									/>
								</div>

								<div className="col-md-5">
									<label className="form-label">รหัสสินค้า (Sales Item)</label>
									{!isReadOnly ? (
										<Select
											options={salesItems}
											formatOptionLabel={(option: any) => (
												<div className="d-flex align-items-center gap-2">
													<span className="fw-bold">{option.item_code}</span>
													<span className="text-muted">{option.item_name}</span>
												</div>
											)}
											getOptionValue={(option: any) => String(option.sales_item_id)}
											value={
												salesItems.find(
													(op: any) => op.sales_item_id === formData.salesItemId
												) || null
											}
											onChange={(option: any) => {
												if (option) {
													setFormData((prev: any) => ({
														...prev,
														salesItemId: option.sales_item_id,
														salesItemCode: option.item_code,
													}));
												} else {
													setFormData((prev: any) => ({ ...prev, salesItemId: undefined, salesItemCode: "" }));
												}
											}}
											placeholder={formData.salesItemCode || "กรุณาเลือกใบสั่งขายก่อน"}
											isClearable
											isSearchable={false}
										/>
									) : (
										<input
											type="text"
											className="form-control"
											value={formData.salesItemCode ?? ""}
											disabled
										/>
									)}
								</div>
								<div className="col-md-2">
									<label className="form-label">จำนวน (Qty)</label>
									{!isReadOnly ? (
										<input
											type="number"
											min={1}
											className="form-control"
											value={formData.quantity}
											onChange={(e) => handleInputChange("quantity", Math.max(1, parseInt(e.target.value) || 1))}
										/>
									) : (
										<input type="text" className="form-control" value={formData.quantity ?? 1} disabled />
									)}
								</div>
							</div>

							<div className="row mb-3">
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

							{/*  Items Table — fully functional */}
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
													<th style={{ width: "15%" }}>จำนวน</th>
													<th style={{ width: "15%" }}>Serial No</th>
													<th style={{ width: "10%" }}>หมายเหตุ</th>
													{!isReadOnly && (
														<th style={{ width: "5%" }}>Action</th>
													)}
												</tr>
											</thead>
											<tbody>
												{formData.items.map((item) => (
													<tr key={item.id}>
														{/* Material selector — scoped to this row */}
														<td>
															{isReadOnly ? (
																<span className="form-control-plaintext px-2">
																	{item.code}
																</span>
															) : (
																<Select
																	isDisabled={materialList.length < 1 || isReadOnly}
																	options={materialList}
																	formatOptionLabel={(option: Material) => (
																		<div>{option.item_code}</div>
																	)}
																	getOptionValue={(option) => option.item_code}
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

														{/*  Description — auto-filled, but still editable */}
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
														<td className="d-flex gap-1 align-items-center">
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
																style={{width : "65%"}}
															/>
															{getMateriakInFormData(item.id) && <span className="fw-bold text-danger">{`(เหลือ ${getMateriakInFormData(item.id)?.remaining_num})`}</span>}
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
											onClick={() => navigate("/quality_control/qc_workorders_list")}
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

			{/* ===== Test Results Section (view mode only) ===== */}
		{mode === "view" && qc_workorder_id && (
			<TestResultSection
				qcWorkOrderId={Number(qc_workorder_id)}
				quantity={formData.quantity ?? 1}
				salesItemDescription={formData.salesItemCode}
				testResultsPre={testResults}
			/>
		)}

		{/* ===== Hidden Printable PDF Layout ===== */}
			<div
				ref={printRef}
				style={{
					position: "absolute",
					left: "-9999px",
					top: 0,
					width: "794px",
					background: "#fff",
					padding: "32px",
					fontFamily: "'Sarabun', 'Tahoma', sans-serif",
					fontSize: "12px",
					color: "#000",
				}}
			>
				{/* PDF Header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
					<div style={{ flex: 1 }}>
						{formData.customerCode && (
							<div style={{ fontSize: 11, color: "#555" }}>{formData.customerCode}</div>
						)}
						{formData.docNum && (
							<div style={{ fontSize: 11, color: "#555" }}>{formData.docNum}</div>
						)}
					</div>
					<div style={{ textAlign: "center", flex: 2 }}>
						<div style={{ fontSize: 18, fontWeight: "bold" }}>ใบสั่งเทส</div>
					</div>
					<div style={{ flex: 1, textAlign: "right", fontSize: 11 }}>
						{formData.documentNumber && <div>เลขที่: {formData.documentNumber}</div>}
					</div>
				</div>

				{/* Info Row */}
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
					<tbody>
						<tr>
							<td style={{ width: "20%", padding: "3px 6px", border: "1px solid #ccc", fontWeight: "bold", background: "#f5f5f5" }}>วันที่</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc" }}>{formData.date}</td>
							<td style={{ width: "20%", padding: "3px 6px", border: "1px solid #ccc", fontWeight: "bold", background: "#f5f5f5" }}>พนักงานขาย</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc" }}>{formData.salesName}</td>
						</tr>
						<tr>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc", fontWeight: "bold", background: "#f5f5f5" }}>ทีม</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc" }}>{formData.teamName}</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc", fontWeight: "bold", background: "#f5f5f5" }}>ลูกค้า</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc" }}>{formData.customerName} {formData.customerCode ? `(${formData.customerCode})` : ""}</td>
						</tr>
						<tr>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc", fontWeight: "bold", background: "#f5f5f5" }}>รหัสสินค้า (Sales Item)</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc" }}>{formData.docEntry}</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc", fontWeight: "bold", background: "#f5f5f5" }}>วันที่ย้าย / ส่ง</td>
							<td style={{ padding: "3px 6px", border: "1px solid #ccc" }}>{formData.customerReceiptNumber}</td>
						</tr>
					</tbody>
				</table>

				{/* Standards */}
				<div style={{ marginBottom: 8 }}>
					<div style={{ fontWeight: "bold", marginBottom: 4, borderBottom: "1px solid #ccc", paddingBottom: 2 }}>มาตรฐาน</div>
					<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
						{([
							["ptt", "PTT"], ["chevron", "Chevron"], ["valeur", "Valeur"],
							["ophir", "Ophir"], ["threeSpec", "3Spec"],
							["standardOthers", `Others${formData.standardOthersText ? `: ${formData.standardOthersText}` : ""}`],
						] as [keyof QCWorkOrderData, string][]).map(([field, label]) => (
							<div key={field as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
								<div style={{
									width: 12, height: 12, border: "1px solid #333",
									background: formData[field] ? "#333" : "#fff",
									display: "inline-block", flexShrink: 0,
								}} />
								<span>{label}</span>
							</div>
						))}
					</div>
				</div>

				{/* Certificate */}
				<div style={{ marginBottom: 8 }}>
					<div style={{ fontWeight: "bold", marginBottom: 4, borderBottom: "1px solid #ccc", paddingBottom: 2 }}>ใบรับรอง</div>
					<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
						{([
							["inHouse", "In-house"], ["thirdParty", "Third Party"], ["ndt", "NDT"],
							["testingOthers", `Others${formData.testingOthersText ? `: ${formData.testingOthersText}` : ""}`],
						] as [keyof QCWorkOrderData, string][]).map(([field, label]) => (
							<div key={field as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
								<div style={{
									width: 12, height: 12, border: "1px solid #333",
									background: formData[field] ? "#333" : "#fff",
									display: "inline-block", flexShrink: 0,
								}} />
								<span>{label}</span>
							</div>
						))}
					</div>
				</div>

				{/* Serial Number */}
				<div style={{ marginBottom: 8 }}>
					<div style={{ fontWeight: "bold", marginBottom: 4, borderBottom: "1px solid #ccc", paddingBottom: 2 }}>Serial Number</div>
					<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
						{([
							["continueSerial", "คล้องวางแห"], ["serialImprint", "ตอกที่ตัวสินค้า"],
							["serialTag", "คล้องแท็ก"],
							["serialOthers", `Others${formData.serialOthersText ? `: ${formData.serialOthersText}` : ""}`],
						] as [keyof QCWorkOrderData, string][]).map(([field, label]) => (
							<div key={field as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
								<div style={{
									width: 12, height: 12, border: "1px solid #333",
									background: formData[field] ? "#333" : "#fff",
									display: "inline-block", flexShrink: 0,
								}} />
								<span>{label}</span>
							</div>
						))}
					</div>
				</div>

				{/* Items Table */}
				<div style={{ marginBottom: 8 }}>
					<div style={{ fontWeight: "bold", marginBottom: 4, borderBottom: "1px solid #ccc", paddingBottom: 2 }}>รายการสินค้า</div>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
						<thead>
							<tr style={{ background: "#f0f0f0" }}>
								<th style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "left" }}>รหัสสินค้า</th>
								<th style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "left" }}>รายละเอียด</th>
								<th style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "center", width: 60 }}>WLL</th>
								<th style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "center", width: 60 }}>จำนวน</th>
								<th style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "left", width: 110 }}>Serial No</th>
								<th style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "left" }}>หมายเหตุ</th>
							</tr>
						</thead>
						<tbody>
							{formData.items.length > 0 ? formData.items.map((item, idx) => (
								<tr key={idx}>
									<td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{item.code}</td>
									<td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{item.description}</td>
									<td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{item.wll}</td>
									<td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{item.quantity}</td>
									<td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{item.serialNo}</td>
									<td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{item.remark}</td>
								</tr>
							)) : (
								<tr>
									<td colSpan={6} style={{ border: "1px solid #ccc", padding: "6px", textAlign: "center", color: "#888" }}>ไม่มีรายการสินค้า</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Remark & Details */}
				{formData.generalRemark && (
					<div style={{ marginBottom: 8 }}>
						<span style={{ fontWeight: "bold" }}>Remark: </span>
						<span style={{ whiteSpace: "pre-wrap" }}>{formData.generalRemark}</span>
					</div>
				)}
				{formData.details && (
					<div style={{ marginBottom: 8 }}>
						<div style={{ fontWeight: "bold", marginBottom: 4 }}>รายละเอียดการเทส</div>
						<div style={{ whiteSpace: "pre-wrap", border: "1px solid #ccc", padding: 6, borderRadius: 2 }}>{formData.details}</div>
					</div>
				)}

				{/* Signature area */}
				<div style={{ display: "flex", gap: 32, marginTop: 24 }}>
					{["ผู้ตรวจสอบ", "ผู้อนุมัติ", "ผู้รับมอบ"].map((label) => (
						<div key={label} style={{ flex: 1, textAlign: "center" }}>
							<div style={{ borderBottom: "1px solid #333", marginBottom: 4, height: 40 }} />
							<div style={{ fontSize: 11 }}>{label}</div>
							<div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>วันที่.............................</div>
						</div>
					))}
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
		</div >
	);
};

export default CreateEditViewQCWorkOrder;