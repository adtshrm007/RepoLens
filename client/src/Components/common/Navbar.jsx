import logo from "../../assets/RepoLensLogo.svg"
export default function Navbar() {
  return (
    <>
      <div className="w-7xl h-20.25 backdrop-blur-md flex items-center justify-around">
        <div className="w-[110px] h-[28px] flex items-center justify-between">
            <img src={logo} alt="Logo" className="h-full w-[28px] bg-none"/>
            <p className="text-base font-black tracking-tighter uppercase text-white">RepoLens</p>
        </div>
        <div className="w-[466px] h-[23px] bg-slate-500"></div>
        <div className="w-[253px] h-[37px] bg-slate-500"></div>
      </div>
    </>
  );
}
