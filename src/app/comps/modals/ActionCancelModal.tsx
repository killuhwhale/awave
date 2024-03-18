import { useState } from "react";

interface ActionCancelProps {
  isOpen: boolean;
  onAction(): void;
  onClose(): void;
  actionText?: string;
  message: string;
  note?: string;
  btnStyle?: string;
}
const ActionCancelModal: React.FC<ActionCancelProps> = ({
  isOpen,
  onAction,
  onClose,
  actionText,
  message,
  note,
  btnStyle,
}) => {
  console.log("isModalOpen", isOpen);
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center ">
          <div
            className="fixed inset-0 bg-gray-900 opacity-20"
            onClick={onClose}
          ></div>
          <div className="z-50 flex h-[350px] w-[600px] flex-col justify-between rounded-md bg-neutral-900 p-4">
            <h2 className="mb-2 justify-center text-center  text-lg font-bold">
              AWave
            </h2>
            <p className="p-4 text-center text-lg">{message}</p>
            <p className="p-4 text-center text-base">{note}</p>
            <div className="flex w-full justify-around">
              <button
                onClick={onClose}
                className="w-1/3 rounded  bg-slate-600 px-4 py-2 font-bold text-white hover:bg-slate-700 focus:bg-slate-700 active:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={onAction}
                className={`w-1/3 rounded  px-4 py-2 font-bold hover:opacity-80 bg-rose-700 text-slate-200 ${btnStyle}`}
              >
                {actionText ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionCancelModal;
