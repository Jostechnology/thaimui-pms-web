import { KTIcon } from "../../../helpers";

type Props = {
    title : string,
    desc : string
}

export default function Alert({title, desc} : Props) {
  return (
    <div className="pt-5 sticky-top">
      <div className="alert alert-dismissible bg-light-success d-flex flex-column flex-sm-row p-5 mb-10 sticky-top">
        <div className="d-flex flex-column text-gray-800 pe-0 pe-sm-10">
          <h5 className="mb-1">{title}</h5>
          <span>{desc}</span>
        </div>

        <button
          type="button"
          className="position-absolute position-sm-relative m-2 m-sm-0 top-0 end-0 btn btn-icon ms-sm-auto"
          data-bs-dismiss="alert"
        >
          <KTIcon className="fs-1" iconName="cross" />
        </button>
      </div>
    </div>
  );
}
