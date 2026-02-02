import { useEffect, useState } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { Content } from "../../../layout/components/content";
import TablePaginator from "../../../../app/custom_components/TablePaginator";
import { getNotificationHistory } from "../../../../app/services/notification";

type Notification = {
	user_id: number;
	user_notification_detail: string;
	user_notification_id: number;
	user_notification_title: string;
	user_notification_url: string;
	created_date : string
};

type NotificationResponse = {
	has_next: boolean;
	has_prev: boolean;
	notifications: Notification[];
	page: number;
	pages: number;
	per_page: number;
	total: number;
};

type Props = {
	show: boolean;
	handleClose: () => void;
};

export default function NotificationHistory({ show, handleClose }: Props) {
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [totalItems, setTotalItems] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [perPage, setPerPage] = useState<number>(10);

	const fetchNotifications = async () => {
		try {
			setIsLoading(true);
			const res = await getNotificationHistory(currentPage);
			const data: NotificationResponse = res.data;

			setNotifications(data.notifications);
			setTotalPages(data.pages);
			setTotalItems(data.total);
			setPerPage(data.per_page);

			console.log(data);
		} catch (err) {
			console.error(err);
			setNotifications([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!show) return;
		fetchNotifications();
	}, [currentPage, show]);

	const handleNotificationClick = (url: string) => {
        window.open(url, "_blank");
    };

	return (
		<Modal
			id="kt_modal_create_ma_vehicle"
			tabIndex={-1}
			aria-hidden="true"
			dialogClassName="modal-dialog modal-dialog-centered mw-900px"
			show={show}
			onHide={handleClose}
			backdrop={true}
		>
			<Modal.Header closeButton>
				<Modal.Title>ประวัติการแจ้งเตือน</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div className="col-12">
					<div className="card shadow-sm">
						<div className="card-body py-3">
							{isLoading ? (
								<div className="text-center py-5">
									<div className="spinner-border text-primary" role="status">
										<span className="visually-hidden">Loading...</span>
									</div>
									<div className="mt-2 text-muted">กำลังโหลดข้อมูล...</div>
								</div>
							) : notifications.length === 0 ? (
								<div className="text-center py-5">
									<i className="bi bi-bell-slash fs-1 text-muted"></i>
									<div className="mt-3 text-muted">ไม่มีประวัติการแจ้งเตือน</div>
								</div>
							) : (
								<div className="table-responsive">
									<table className="table table-hover align-middle mb-0">
										<thead className="table-light">
											<tr>
												<th style={{ width: "25%" }}>หัวข้อ</th>
												<th style={{ width: "50%" }}>รายละเอียด</th>
												<th style={{ width: "10%" }} className="text-center">
													วันที่แจ้งเตือน
												</th>
												<th style={{ width: "15%" }} className="text-center">
													ดูรายละเอียด
												</th>
											</tr>
										</thead>
										<tbody>
											{notifications.map((notification, index) => (
												<tr key={notification.user_notification_id}>
													
													<td>
														<div className="d-flex align-items-center">
															<i className="bi bi-bell-fill text-primary me-2"></i>
															<span className="fw-semibold">
																{notification.user_notification_title}
															</span>
														</div>
													</td>
													<td>
														<span className="text-muted">
															{notification.user_notification_detail}
														</span>
													</td>
													<td>
														<span className="text-muted">
															{notification.created_date}
														</span>
													</td>
													<td className="text-center">
														<Button
															variant="light-primary"
															size="sm"
															onClick={() =>
																handleNotificationClick(
																	notification.user_notification_url
																)
															}
														>
															<i className="bi bi-arrow-right-circle me-1"></i>
															ดูรายละเอียด
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							{!isLoading && totalPages > 1 && (
								<div className="mt-3">
									<TablePaginator
										currentPage={currentPage}
										setCurrentPage={setCurrentPage}
										totalPages={totalPages}
									/>
								</div>
							)}
						</div>

						{/* Server-side Pagination Info */}
						{!isLoading && totalPages > 1 && (
							<div className="card-footer bg-white border-0 py-3">
								<div className="d-flex justify-content-between align-items-center">
									<div className="text-muted">
										หน้า {currentPage} จาก {totalPages} | ทั้งหมด {totalItems} รายการ
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={handleClose}>
					ปิด
				</Button>
			</Modal.Footer>
		</Modal>
	);
}
