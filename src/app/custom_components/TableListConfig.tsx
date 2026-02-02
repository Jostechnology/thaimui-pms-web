interface TableListConfigProps {
    pageConfig: number;
    setPageConfig: (value: number) => void;
}


function TableListConfig(props: TableListConfigProps) {

    const {
        pageConfig,
        setPageConfig
    } = props;

    return (
        <div className="d-flex align-items-end justify-content-end mb-5">
            <span className="fs-5 me-3">จำนวนรายการ</span>
            <select className="form-select" style={{ width: "80px", height: "35px", padding: "0px 0px 0px 20px" }}
                value={pageConfig}
                onChange={(e) => {
                    let { value } = e.target;
                    setPageConfig(Number(value));
                }}
            >
                {
                    [10, 20, 50, 100].map((item, index) => (
                        <option key={index} value={item}>{item}</option>
                    ))}
            </select>
        </div>
    )
}

export default TableListConfig
