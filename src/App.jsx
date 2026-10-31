import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, GraduationCap, Menu, MoveUpRight, Plus, Sparkles, X, ShieldCheck, Users, Target, Compass, Clock3, Mail, MapPin, Phone, Download, CalendarDays, Trash2, Pencil, LogOut, LayoutDashboard, BookMarked, MessageSquare, ImagePlus, LoaderCircle, CircleHelp, Award } from "lucide-react";
import { api, imageFallback, imageUrl, uploadImage } from "./api";
import "./adminImage.css";
import "./adminOverview.css";
import { ADMIN_ENTRY_PATH, ADMIN_OVERVIEW_SECTIONS, beginAdminLoginEntry, buildAdminEditForm, buildAdminPayload, getAdminDataPath, getAdminEntrySession, getAdminSection, getAdminSession, isAdminEntryPath, isAdminSessionInvalid, isKnownAdminPath, replaceAdminRecord } from "./adminState";
import EnquiryInbox from "./EnquiryInbox";
import ContactSettingsEditor from "./ContactSettingsEditor";
import { DEFAULT_CONTACT_SETTINGS } from "../shared/contactSettings";
import PublicCursor from "./PublicCursor";
import "./publicCursor.css";

const demo = {
 courses: [
  { _id:"d1",title:"Foundation Programme",category:"FOUNDATION",duration:"12 weeks",icon:"✳",description:"Build confidence in essential concepts with guided lessons, deliberate practice and structured revision.",featured:true },
  { _id:"d2",title:"Mathematics Mastery",category:"SUBJECT SUPPORT",duration:"10 weeks",icon:"∑",description:"Strengthen problem-solving skills and develop a clear approach to core mathematics topics.",featured:true },
  { _id:"d3",title:"Science Explorers",category:"SUBJECT SUPPORT",duration:"12 weeks",icon:"⚗",description:"Connect scientific concepts with practical examples, clear explanations and active learning.",featured:true },
  { _id:"d4",title:"Exam Preparation",category:"EXAM READINESS",duration:"16 weeks",icon:"◎",description:"Plan revision, practise question patterns and build a steady exam preparation routine.",featured:true },
  { _id:"d5",title:"English & Communication",category:"SKILL BUILDING",duration:"8 weeks",icon:"Aa",description:"Improve reading, writing, grammar and communication through structured practice." },
  { _id:"d6",title:"Personal Learning Support",category:"GUIDED LEARNING",duration:"Flexible",icon:"↗",description:"A supportive learning path shaped around individual goals and areas for improvement." }
 ],
 faculty:[
  {_id:"f1",name:"Dr. Aanya Mehta",role:"Mathematics Mentor",qualification:"M.Sc. Mathematics · 8 years",image:"https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=85",description:"Makes challenging ideas approachable through clear explanations and practice."},
  {_id:"f2",name:"Rohan Kulkarni",role:"Science Educator",qualification:"M.Sc. Physics · 7 years",image:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",description:"Connects classroom concepts to practical examples and curiosity-led learning."},
  {_id:"f3",name:"Neha Sharma",role:"Language Coach",qualification:"M.A. English · 6 years",image:"https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=85",description:"Helps learners communicate with clarity, confidence and purpose."}
 ],
 results:[
  {_id:"r1",name:"Sample learner A",role:"Foundation programme",year:"2026",score:"92%",description:"Illustrative result for design preview only."},
  {_id:"r2",name:"Sample learner B",role:"Mathematics mastery",year:"2026",score:"88%",description:"Illustrative result for design preview only."},
  {_id:"r3",name:"Sample learner C",role:"Exam preparation",year:"2026",score:"95%",description:"Illustrative result for design preview only."}
 ],
 testimonials:[
  {_id:"t1",name:"Aarav M.",role:"Sample student",quote:"The structured lessons helped me break a big goal into smaller, manageable steps."},
  {_id:"t2",name:"Sana K.",role:"Sample student",quote:"I felt comfortable asking questions and could see where I needed more practice."},
  {_id:"t3",name:"Riya V.",role:"Sample student",quote:"The learning plan gave me more confidence and helped me stay consistent."}
 ],
 notices:[
  {_id:"n1",title:"Sample admissions are open",category:"Admissions",type:"Notice",date:"Demo notice",description:"Contact our team to discuss sample course options for the upcoming academic session."},
  {_id:"n2",title:"Weekly study planner",category:"Student support",type:"Resource",date:"Demo resource",description:"A sample planning guide to help learners organise weekly study goals."},
  {_id:"n3",title:"Welcome orientation",category:"Community",type:"Event",date:"Demo event",description:"A placeholder event notice. Replace with an approved date before publishing."}
 ],
 resources:[
  {_id:"s1",title:"A calmer study week",category:"Study guide",type:"Sample resource",description:"A demo study-planning resource. Replace with a real approved download before launch."},
  {_id:"s2",title:"Getting ready for assessments",category:"Checklist",type:"Checklist",description:"A sample checklist for preparing materials, setting goals and planning revision."},
  {_id:"s3",title:"How to ask better questions",category:"Learning tips",type:"Article",description:"A short sample article about curiosity, note-taking and asking for help."}
 ]
};
const fadeUp = { hidden:{opacity:0,y:22}, show:{opacity:1,y:0,transition:{duration:.55,ease:[.22,1,.36,1]}} };
function Reveal({children,className="",delay=0}){const reduce=useReducedMotion();return <motion.div className={className} variants={fadeUp} initial={reduce?"show":"hidden"} whileInView="show" viewport={{once:true,amount:.12}} transition={{delay}}>{children}</motion.div>}
function useContent(){const [content,setContent]=useState({...demo,contact:DEFAULT_CONTACT_SETTINGS});const [loading,setLoading]=useState(true);const refresh=async()=>{const keys=["courses","faculty","results","testimonials","notices","resources"];const results=await Promise.all(keys.map(async key=>{try{const data=await api(`/content/${key}`);return [key,data.length?data:demo[key]]}catch{return [key,demo[key]]}}));let contact=DEFAULT_CONTACT_SETTINGS;try{contact={...DEFAULT_CONTACT_SETTINGS,...await api("/content/contact")}}catch{}setContent({...Object.fromEntries(results),contact});setLoading(false)};useEffect(()=>{const handleContentChange=()=>{refresh()};window.addEventListener("astratech:content-changed",handleContentChange);refresh();return()=>window.removeEventListener("astratech:content-changed",handleContentChange)},[]);return {content,refresh,loading};}
function Header(){const [open,setOpen]=useState(false);const loc=useLocation();useEffect(()=>setOpen(false),[loc.pathname]);const links=[["About","/about"],["Courses","/courses"],["Faculty","/faculty"],["Results","/results"],["Resources","/resources"]];return <><div className="topline">Learn Today. Lead Tomorrow. <span>Admissions enquiries welcome <ArrowUpRight size={12}/></span></div><header className="header"><Link className="brand" to="/"><span className="brand-icon">A<span>✦</span></span><span className="brand-name">astrratech<small>LEARNING ACADEMY</small></span></Link><nav className={open?"nav nav-open":"nav"}>{links.map(([label,path])=><NavLink key={path} to={path}>{label}</NavLink>)}<Link to="/admissions">Admissions</Link><Link to="/contact">Contact</Link></nav><Link className="btn btn-dark header-btn" to="/contact">Enquire now <ArrowUpRight size={15}/></Link><button className="mobile-toggle" onClick={()=>setOpen(!open)} aria-label="Toggle menu">{open?<X/>:<Menu/>}</button></header></>}

function Footer({ contact = DEFAULT_CONTACT_SETTINGS }) {
  return (
    <footer className="footer">
      <div className="wrap footer-main">
        {/* Brand */}
        <div className="footer-brand-column">
          <Link className="brand brand-light" to="/">
            <span className="brand-icon">
              A<span>&#10022;</span>
            </span>
            <span className="brand-name">
              astrratech
              <small>LEARNING ACADEMY</small>
            </span>
          </Link>

          <p className="footer-intro">
            A considered approach to learning, confidence and what comes next.
          </p>
        </div>

        {/* Explore */}
        <div className="footer-link-column">
          <h4>Explore</h4>
          <Link to="/about">Our approach</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/faculty">Faculty</Link>
          <Link to="/results">Results &amp; achievements</Link>
          <Link to="/testimonials">Testimonials</Link>
        </div>

        {/* Student corner */}
        <div className="footer-link-column">
          <h4>Student corner</h4>
          <Link to="/admissions">Admissions</Link>
          <Link to="/resources">Study resources</Link>
          <Link to="/notices">News &amp; notices</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/faq">FAQs</Link>
        </div>

        {/* Contact */}
        <div className="footer-contact-column">
          <h4>Get in touch</h4>

          <a href={`mailto:${contact.email}`}>
            <Mail size={15} aria-hidden="true" />
            <span>{contact.email}</span>
          </a>

          <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>
            <Phone size={15} aria-hidden="true" />
            <span>{contact.phone}</span>
          </a>

          <span className="footer-address">
            <MapPin size={15} aria-hidden="true" />
            <span>{contact.address}</span>
          </span>
        </div>
      </div>

      {/* Copyright and legal links */}
      <div className="wrap footer-bottom">
<span>
  &copy; {new Date().getFullYear()} Astrratech Learning Academy.
  All rights reserved.
</span>

        <div className="footer-legal-links">
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms &amp; refund</Link>
          <Link
            className="footer-admin-link"
            to={ADMIN_ENTRY_PATH}
            onClick={() => beginAdminLoginEntry(localStorage)}
          >
            Admin Login
          </Link>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({eyebrow,title,copy}){return <div className="section-heading"><div><div className="eyebrow"><span/> {eyebrow}</div><h2>{title}</h2></div>{copy&&<p>{copy}</p>}</div>}
function ButtonLink({to,children,light=false}){return <Link className={`btn ${light?"btn-light":"btn-dark"}`} to={to}>{children}<ArrowUpRight size={16}/></Link>}
function courseSlug(course){return String(course.slug||course._id||course.title).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function coursePath(course){return `/courses/${encodeURIComponent(course.slug?courseSlug(course):course._id||courseSlug(course))}`}
function resourcePath(resource){return `/resources/${encodeURIComponent(resource._id||courseSlug(resource))}`}
function findByIdOrSlug(items,id){const normalized=id.toLowerCase();return items.find(item=>String(item._id||"").toLowerCase()===normalized||String(item.slug||"").toLowerCase()===normalized||courseSlug(item)===normalized)}
function HeroReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const targetsRef = useRef([]);
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".hero-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    targetsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = centerX - pointer.x;
        const dy = centerY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const radius = 105;

        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 9;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 2.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.19;
        position.y += (targetY - position.y) * 0.19;
        position.rotate +=
          (targetRotate - position.rotate) * 0.19;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);

    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);

      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="hero-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

return (
  <h1
    ref={headingRef}
    className="hero-reactive-heading"
    aria-label="Make room for what’s possible."
  >
    <span className="hero-heading-line" aria-hidden="true">
      {renderCharacters("Make room for")}
    </span>

    <em className="hero-heading-em" aria-hidden="true">
      {renderCharacters("what’s possible.")}
    </em>
  </h1>
);
}



function AboutReactiveHeading({ level = 2, firstLine, secondLine, italicSecond = true }) {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".about-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = centerX - pointer.x;
        const dy = centerY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const radius = 105;

        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 9;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 2.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.19;
        position.y += (targetY - position.y) * 0.19;
        position.rotate +=
          (targetRotate - position.rotate) * 0.19;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

function onPointerMove(event) {
  if (reducedMotion.matches || !finePointer.matches) return;

  pointerRef.current = {
    x: event.clientX,
    y: event.clientY,
  };

  if (animationRef.current === null) {
    animationRef.current = requestAnimationFrame(animate);
  }
}


    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="about-reactive-char"
        key={`${index}-${char}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  const HeadingTag = `h${level}`;

  return (
    <HeadingTag
      ref={headingRef}
      className="about-reactive-heading"
      aria-label={`${firstLine} ${secondLine}`}
    >
      <span className="about-heading-line" aria-hidden="true">
        {renderCharacters(firstLine)}
      </span>

      {italicSecond ? (
        <em className="about-heading-line about-heading-em" aria-hidden="true">
          {renderCharacters(secondLine)}
        </em>
      ) : (
        <span className="about-heading-line" aria-hidden="true">
          {renderCharacters(secondLine)}
        </span>
      )}
    </HeadingTag>
  );
}


function ProgrammeReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".programme-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = centerX - pointer.x;
        const dy = centerY - pointer.y;
        const distance = Math.hypot(dx, dy);

        // A smaller radius and gentler movement than the hero.
        const radius = 90;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 5;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 1.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.17;
        position.y += (targetY - position.y) * 0.17;
        position.rotate +=
          (targetRotate - position.rotate) * 0.17;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function resetMotion() {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      chars.forEach((char) => {
        char.style.transform = "none";
      });

      positionsRef.current.forEach((position) => {
        position.x = 0;
        position.y = 0;
        position.rotate = 0;
      });

      pointerRef.current = { x: -1000, y: -1000 };
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        resetMotion();
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);

    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);

      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="programme-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="programme-reactive-heading"
      aria-label="Programmes for your next big step."
    >
      <span className="programme-heading-line" aria-hidden="true">
        {renderCharacters("Programmes for your")}
      </span>

      <em className="programme-heading-em" aria-hidden="true">
        {renderCharacters("next big step.")}
      </em>
    </h2>
  );
}


function ApproachReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".approach-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const distance = Math.hypot(dx, dy);

        const radius = 90;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 5;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 1.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.17;
        position.y += (targetY - position.y) * 0.17;
        position.rotate +=
          (targetRotate - position.rotate) * 0.17;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="approach-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="approach-reactive-heading"
      aria-label="A considered approach to learning."
    >
      <span className="approach-heading-line" aria-hidden="true">
        {renderCharacters("A considered approach")}
      </span>

      <em className="approach-heading-em" aria-hidden="true">
        {renderCharacters("to learning.")}
      </em>
    </h2>
  );
}

function AdmissionsReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".admissions-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();

        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const distance = Math.hypot(dx, dy);

        const radius = 90;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 5;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 1.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.17;
        position.y += (targetY - position.y) * 0.17;
        position.rotate +=
          (targetRotate - position.rotate) * 0.17;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);

    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);

      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="admissions-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="admissions-reactive-heading"
      aria-label="Getting started can be simple."
    >
      <span
        className="admissions-heading-line"
        aria-hidden="true"
      >
        {renderCharacters("Getting started")}
      </span>

      <span
        className="admissions-heading-line"
        aria-hidden="true"
      >
        {renderCharacters("can be ")}
        <em className="admissions-heading-em">
          {renderCharacters("simple.")}
        </em>
      </span>
    </h2>
  );
}

function NoticesReactiveHeading() {
  const headingRef = useRef(null);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const chars = Array.from(
      heading.querySelectorAll(".notices-reactive-char")
    );

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const finePointer = window.matchMedia(
      "(pointer: fine)"
    ).matches;

    if (reduceMotion || !finePointer) return;

    let animationFrame = null;
    let pointerX = -1000;
    let pointerY = -1000;

    const radius = 150;
    const force = 2.2;
    const rotationFactor = 0.45;

    const animateChars = () => {
      chars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        const charX = rect.left + rect.width / 2;
        const charY = rect.top + rect.height / 2;

        const dx = pointerX - charX;
        const dy = pointerY - charY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < radius) {
          const intensity =
            Math.pow(1 - distance / radius, 2) * force;

          const moveX = -dx * 0.09 * intensity;
          const moveY = -dy * 0.09 * intensity;
          const rotation =
            (dx / radius) * rotationFactor * intensity;

          char.style.transform =
            `translate3d(${moveX}px, ${moveY}px, 0) rotate(${rotation}deg)`;
        } else {
          char.style.transform =
            "translate3d(0, 0, 0) rotate(0deg)";
        }
      });

      animationFrame = null;
    };

    const handlePointerMove = (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!animationFrame) {
        animationFrame = requestAnimationFrame(animateChars);
      }
    };

    const handlePointerLeave = () => {
      pointerX = -1000;
      pointerY = -1000;

      if (!animationFrame) {
        animationFrame = requestAnimationFrame(animateChars);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("blur", handlePointerLeave);

    document.addEventListener(
      "mouseleave",
      handlePointerLeave
    );

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handlePointerLeave);

      document.removeEventListener(
        "mouseleave",
        handlePointerLeave
      );

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  const renderLine = (text, lineKey) =>
    Array.from(text).map((char, index) => (
      <span
        className="notices-reactive-char"
        key={`${lineKey}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  return (
    <h2
      ref={headingRef}
      className="notices-reactive-heading"
      aria-label="Useful updates for the learning journey."
    >
      <span className="notices-heading-line">
        {renderLine("Useful updates for", "line1")}
      </span>

      <span className="notices-heading-line">
        {renderLine("the learning journey.", "line2")}
      </span>
    </h2>
  );
}


function ResultsReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".results-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const distance = Math.hypot(dx, dy);

        const radius = 105;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 9;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 2.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.19;
        position.y += (targetY - position.y) * 0.19;
        position.rotate +=
          (targetRotate - position.rotate) * 0.19;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="results-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="results-reactive-heading"
      aria-label="Progress worth celebrating."
    >
      <span className="results-heading-line" aria-hidden="true">
        {renderCharacters("Progress worth")}
      </span>

      <em className="results-heading-em" aria-hidden="true">
        {renderCharacters("celebrating.")}
      </em>
    </h2>
  );
}

function FacultyReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".faculty-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const distance = Math.hypot(dx, dy);

        const radius = 105;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 9;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 2.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.19;
        position.y += (targetY - position.y) * 0.19;
        position.rotate +=
          (targetRotate - position.rotate) * 0.19;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="faculty-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="faculty-reactive-heading"
      aria-label="A good guide makes a difference."
    >
      <span className="faculty-heading-line" aria-hidden="true">
        {renderCharacters("A good guide makes")}
      </span>

      <em className="faculty-heading-em" aria-hidden="true">
        {renderCharacters("a difference.")}
      </em>
    </h2>
  );
}


function StoriesReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".stories-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const distance = Math.hypot(dx, dy);

        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        const radius = 105;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 9;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 2.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.19;
        position.y += (targetY - position.y) * 0.19;
        position.rotate +=
          (targetRotate - position.rotate) * 0.19;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        chars.forEach((char) => {
          char.style.transform = "none";
        });

        positionsRef.current.forEach((position) => {
          position.x = 0;
          position.y = 0;
          position.rotate = 0;
        });
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="stories-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="stories-reactive-heading"
      aria-label="Every learner has a story to tell."
    >
      <span className="stories-heading-line" aria-hidden="true">
        {renderCharacters("Every learner has")}
      </span>

      <em className="stories-heading-em" aria-hidden="true">
        {renderCharacters("a story to tell.")}
      </em>
    </h2>
  );
}


function FooterReactiveHeading() {
  const headingRef = useRef(null);
  const animationRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const positionsRef = useRef([]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const chars = Array.from(
      heading.querySelectorAll(".footer-reactive-char")
    );

    positionsRef.current = chars.map(() => ({
      x: 0,
      y: 0,
      rotate: 0,
    }));

    let disposed = false;

    function animate() {
      animationRef.current = null;
      if (disposed) return;

      const pointer = pointerRef.current;
      let moving = false;

      chars.forEach((char, index) => {
        const rect = char.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = centerX - pointer.x;
        const dy = centerY - pointer.y;
        const distance = Math.hypot(dx, dy);

        const radius = 90;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          finePointer.matches &&
          !reducedMotion.matches &&
          distance < radius &&
          distance > 0
        ) {
          const influence = Math.pow(1 - distance / radius, 2);
          const force = influence * 5;

          targetX = (dx / distance) * force;
          targetY = (dy / distance) * force;
          targetRotate = (dx / distance) * influence * 1.5;
        }

        const position = positionsRef.current[index];

        position.x += (targetX - position.x) * 0.17;
        position.y += (targetY - position.y) * 0.17;
        position.rotate +=
          (targetRotate - position.rotate) * 0.17;

        char.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          rotate(${position.rotate}deg)
        `;

        if (
          Math.abs(position.x - targetX) > 0.08 ||
          Math.abs(position.y - targetY) > 0.08 ||
          Math.abs(position.rotate - targetRotate) > 0.08
        ) {
          moving = true;
        }
      });

      if (moving) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      if (reducedMotion.matches || !finePointer.matches) return;

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function onPointerLeave() {
      pointerRef.current = { x: -1000, y: -1000 };

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    function resetMotion() {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      chars.forEach((char) => {
        char.style.transform = "none";
      });

      positionsRef.current.forEach((position) => {
        position.x = 0;
        position.y = 0;
        position.rotate = 0;
      });

      pointerRef.current = { x: -1000, y: -1000 };
    }

    function onPreferenceChange() {
      if (reducedMotion.matches || !finePointer.matches) {
        resetMotion();
      }
    }

    heading.addEventListener("pointermove", onPointerMove);
    heading.addEventListener("pointerleave", onPointerLeave);

    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;

      heading.removeEventListener("pointermove", onPointerMove);
      heading.removeEventListener("pointerleave", onPointerLeave);

      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      chars.forEach((char) => {
        char.style.transform = "";
      });
    };
  }, []);

  function renderCharacters(text) {
    return Array.from(text).map((char, index) => (
      <span
        className="footer-reactive-char"
        key={`${char}-${index}`}
        aria-hidden="true"
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }

  return (
    <h2
      ref={headingRef}
      className="footer-reactive-heading"
      aria-label="Your next step starts with a hello."
    >
      <span className="footer-heading-line" aria-hidden="true">
        {renderCharacters("Your next step starts")}
      </span>

      <span className="footer-heading-line" aria-hidden="true">
        {renderCharacters("with ")}
        <em className="footer-heading-em">
          {renderCharacters("a hello.")}
        </em>
      </span>
    </h2>
  );
}



function Home({content}){return <><main><section className="hero wrap"><div className="hero-copy"><Reveal><div className="eyebrow"><span/> LEARN WITH INTENTION</div><HeroReactiveHeading /><p className="hero-lead">A learning experience built around strong foundations, thoughtful guidance and the confidence to take your next step.</p><div className="hero-actions"><ButtonLink to="/courses">Explore programmes</ButtonLink><Link className="underlink" to="/about">Discover our approach <ArrowRight size={16}/></Link></div><div className="hero-proof"><div className="proof-avatars"><span>A</span><span>R</span><span>S</span><span>+</span></div><div><strong>Every learner has a path.</strong><small>We help you find yours.</small></div></div></Reveal></div><Reveal className="hero-visual"><div className="hero-photo"><div className="hero-photo-overlay"/><div className="hero-photo-caption"><span className="caption-star"><Sparkles size={17}/></span><div><strong>Progress, with purpose.</strong><small>A little better every day.</small></div></div></div><div className="float-card float-top"><span className="float-symbol"><Target size={19}/></span><div><strong>Learning that fits</strong><small>Clear goals, steady growth</small></div></div><div className="float-card float-bottom"><div className="bars"><i/><i/><i/><i/><i/></div><div><strong>Find your momentum</strong><small>One step at a time</small></div></div><div className="hero-stamp">GROW<br/>WITH<br/>CONFIDENCE <ArrowDownRight size={18}/></div></Reveal></section><div className="trustbar"><div className="wrap trust-inner"><span><ShieldCheck/> Student-first learning</span><span><Users/> Supportive mentors</span><span><Target/> Purposeful practice</span><span><Compass/> A path that feels clear</span></div></div>
<section className="section section-soft">
  <div className="wrap">
    <div className="section-heading">
      <div>
        <div className="eyebrow">
          <span /> FIND YOUR DIRECTION
        </div>

        <ProgrammeReactiveHeading />
      </div>

      <p>
        Explore our learning programmes. Each one is designed to make
        learning feel structured, supportive and purposeful.
      </p>
    </div>

    <div className="course-grid">
      {content.courses.slice(0, 3).map((c, i) => (
        <CourseCard c={c} i={i} key={c._id || c.title} />
      ))}
    </div>

    <div className="section-end">
      <ButtonLink to="/courses">Explore all courses</ButtonLink>
    </div>
  </div>
</section>
<section className="section wrap" id="about-preview">
  <div className="section-heading">
    <div>
      <div className="eyebrow">
        <span /> WHY CHOOSE THIS ACADEMY
      </div>
      <ApproachReactiveHeading />
    </div>

    <p>
      Strong foundations, thoughtful support and steady progress shape a
      clear learning experience.
    </p>
  </div>

  <div className="approach-grid">
    <Reveal className="approach-image">
      <img
        src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=85"
        alt="Students learning together"
      />

      <div className="image-note">
        <span>✳</span>
        <div>
          <strong>Curiosity is a good place to start.</strong>
          <small>Sample academy photography</small>
        </div>
      </div>
    </Reveal>

    <div className="approach-points">
      {[
        [
          "01",
          "Build strong foundations",
          "Understand the why, not just the answer.",
        ],
        [
          "02",
          "Feel supported along the way",
          "Ask questions, get feedback and practise with purpose.",
        ],
        [
          "03",
          "Make progress visible",
          "Create a routine that turns small wins into momentum.",
        ],
      ].map(([n, t, d]) => (
        <Reveal className="approach-point" key={n}>
          <span>{n}</span>
          <div>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
          <ArrowUpRight size={17} />
        </Reveal>
      ))}

      <ButtonLink to="/about">Meet Astrratech</ButtonLink>
    </div>
  </div>

  <div className="learning-journey">
    <h3>Your learning journey</h3>

    <div className="admission-steps">
      {[
        ["01", "Start with your goals"],
        ["02", "Build steady habits"],
        ["03", "Keep moving forward"],
      ].map(([n, t]) => (
        <div key={n}>
          <span>{n}</span>
          <strong>{t}</strong>
          <ArrowUpRight />
        </div>
      ))}
    </div>

    <ButtonLink to="/admissions" light>
      How admissions work
    </ButtonLink>
  </div>
</section>

<section className="section section-soft" id="results-preview">
  <div className="wrap">
    <div className="section-heading">
      <div>
        <div className="eyebrow">
          <span /> RESULTS &amp; ACHIEVEMENTS
        </div>

        <ResultsReactiveHeading />
      </div>

      <p>
        Discover the progress our learners strive for through focused preparation, strong foundations and a commitment to excellence.
      </p>
    </div>

    <div className="results-note">
      <ShieldCheck />
      <p>
        <strong>results.</strong>  Every milestone reflects dedication, consistent effort and a passion for learning.
      </p>
    </div>

    <div className="result-grid">
      {content.results.slice(0, 3).map((r, i) => (
        <Reveal
          className="result-card"
          key={r._id || r.name || r.title || i}
        >
          <span className="result-num">0{i + 1}</span>
          <strong>{r.score || "—"}</strong>
          <h3>{r.name || r.title}</h3>
          <p>
            {r.role} · {r.year}
          </p>
          <small>{r.description}</small>
        </Reveal>
      ))}
    </div>

    <div className="section-end">
      <ButtonLink to="/results">All results &amp; achievements</ButtonLink>
    </div>
  </div>
</section>

<section className="section wrap" id="faculty-preview">
  <div className="section-heading">
    <div>
      <div className="eyebrow">
        <span /> PEOPLE WHO HELP YOU GROW
      </div>

      <FacultyReactiveHeading />
    </div>

    <p>
    Meet the educators who inspire curiosity, simplify complex concepts and help every learner build confidence through meaningful guidance and personalised support.
    </p>
  </div>

  <div className="faculty-grid">
    {content.faculty.slice(0, 3).map((f, i) => (
      <FacultyCard
        f={f}
        i={i}
        key={f._id || f.name}
      />
    ))}
  </div>

  <div className="section-end">
    <Link className="underlink" to="/faculty">
      Meet the full faculty <ArrowRight size={16} />
    </Link>
  </div>
</section>

<section className="section wrap" id="student-stories">
  <div className="section-heading">
    <div>
      <div className="eyebrow">
        <span /> STUDENT STORIES
      </div>
      <StoriesReactiveHeading />
    </div>

    <p>
      Discover how the right guidance, structured learning and consistent
      practice can help learners grow in confidence and move towards their goals.
    </p>
  </div>

  <TestimonialCards testimonials={content.testimonials.slice(0, 3)} />

  <div className="section-end">
    <ButtonLink to="/testimonials">Read all testimonials</ButtonLink>
  </div>
</section>

<section
  className="section section-soft"
  id="notices-preview"
>
  <div className="wrap">
    <div className="section-heading notices-section-heading">
      <div>
        <div className="eyebrow">
          <span /> LATEST NOTICES
        </div>

        <NoticesReactiveHeading />
      </div>

      <p>
        Stay informed about learning resources, upcoming events
        and important updates from the academy.
      </p>
    </div>

    <div className="notice-list">
      {content.notices.slice(0, 3).map((n, i) => (
        <Reveal
          className="notice-row"
          key={n._id || n.title}
        >
          <span className="notice-index">
            0{i + 1}
          </span>

          <div>
            <small>
              {n.type || n.category || "UPDATE"}
            </small>

            <h3>{n.title}</h3>

            <p>{n.description}</p>
          </div>

          <ArrowUpRight />
        </Reveal>
      ))}
    </div>

    <div className="section-end">
      <ButtonLink to="/notices">
        All notices &amp; events
      </ButtonLink>
    </div>
  </div>
</section>

<section
  className="section section-soft"
  id="admissions-preview"
>
  <div className="wrap admission-preview">
    <div>
      <div className="eyebrow">
        <span /> YOUR NEXT CHAPTER
      </div>

      <AdmissionsReactiveHeading />

      <p>
        Tell us what you want to learn. We’ll help you understand
        the options and what comes next.
      </p>

      <ButtonLink to="/admissions">
        Explore admissions
      </ButtonLink>
    </div>

    <div>
      <div className="admission-steps">
        {[
          ["01", "Tell us your goals"],
          ["02", "Explore course options"],
          ["03", "Plan your start"],
        ].map(([n, t]) => (
          <div key={n}>
            <span>{n}</span>
            <strong>{t}</strong>
            <ArrowUpRight />
          </div>
        ))}
      </div>

      <div className="faq-list home-faq-preview">
        <h3>Frequently asked</h3>

        <details className="admissions-faq-item">
          <summary>
            <span>How do I enquire about admission?</span>
            <Plus size={16} />
          </summary>
          <p>
            "Getting started is simple. Visit our Contact page and submit the enquiry form with your name, contact details and area of interest. Our team will help you understand the admission process and guide you through the next steps."
            
          </p>
        </details>

        <details className="admissions-faq-item">
          <summary>
            <span>Can I access study resources online?</span>
            <Plus size={16} />
          </summary>
          <p>
            "Students can refer to the learning materials and resources made available for their respective programmes. For details about specific study materials, please get in touch with our team."
          </p>
        </details>

        <Link className="underlink" to="/faq">
          View all FAQs <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  </div>
</section>

<section className="cta-strip">
  <div className="wrap cta-inner">
    <div>
      <div className="eyebrow eyebrow-light">
        <span /> READY WHEN YOU ARE
      </div>

      <FooterReactiveHeading />
    </div>

    <ButtonLink to="/contact" light>
      Send an enquiry
    </ButtonLink>
  </div>
</section>
</main>
</>
}



function CourseCard({c,i=0}){return <Reveal className="course-card-wrap" delay={i*.12}><Link className="course-card" to={coursePath(c)} aria-label={`View ${c.title} course details`}><div className="course-card-top"><span className="course-icon">{c.icon||"✳"}</span><span className="course-category">{c.category||"PROGRAMME"}</span></div><h3>{c.title}</h3><p>{c.description}</p><div className="course-bottom"><span><Clock3 size={13}/> {c.duration||"Flexible schedule"}</span><span className="course-card-arrow" aria-hidden="true"><ArrowUpRight/></span></div></Link></Reveal>}
function CourseDetail({content,loading}){const {courseId}=useParams();const id=courseId.toLowerCase();const course=content.courses.find(item=>String(item._id).toLowerCase()===id||String(item.slug||"").toLowerCase()===id||courseSlug(item)===id);if(!course&&loading)return <PageHero eyebrow="COURSE DETAILS" title="Loading course…" copy="Please wait while course details are loaded."/>;if(!course)return <><PageHero eyebrow="COURSE NOT FOUND" title={<>We couldn’t find<br/><em>that course.</em></>} copy="The course may have been removed or its link may be out of date."/><section className="section wrap"><div className="inline-callout"><BookOpen/><div><strong>Browse available courses</strong><p>Explore the current course list or contact us for help.</p></div><ButtonLink to="/courses">View courses</ButtonLink></div></section></>;return <><PageHero eyebrow={course.category||"COURSE DETAILS"} title={course.title} copy={course.description}/><section className="section wrap"><div className="course-detail-meta"><div><small>CATEGORY</small><strong>{course.category||"Programme"}</strong></div><div><small>DURATION</small><strong>{course.duration||"Flexible schedule"}</strong></div></div><div className="inline-callout"><BookOpen/><div><strong>Interested in this course?</strong><p>Contact us to discuss course details and your enquiry.</p></div><ButtonLink to="/contact">Enquire now</ButtonLink></div></section></>}
function FacultyCard({f,i=0}){return <Reveal className="faculty-card" delay={i*.07}><div className="faculty-photo"><img src={imageUrl(f.image)||imageFallback} alt={`${f.name} profile`} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=imageFallback}}/><span className="faculty-tag">ASTRRATECH FACULTY</span></div><div className="faculty-info"><div><h3>{f.name}</h3><p>{f.role}</p><small>{f.qualification}</small></div><ArrowUpRight/></div><p className="faculty-desc">{f.description}</p></Reveal>}
function AdminImageField({value,onChange}){const [file,setFile]=useState(null);const [preview,setPreview]=useState("");const [error,setError]=useState("");const [uploading,setUploading]=useState(false);const input=useRef(null);useEffect(()=>{if(!file){setPreview("");return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);const previewSource=file?preview:imageUrl(value);const filename=file?.name||value?.split(/[?#]/)[0].split("/").pop()||"";async function upload(){if(!file)return;setUploading(true);setError("");try{const savedImage=await uploadImage(file);onChange(savedImage);setFile(null);if(input.current)input.current.value=""}catch(e){setError(e.message)}finally{setUploading(false)}}function remove(){setFile(null);if(input.current)input.current.value="";onChange("");setError("")}return <div className="admin-image-field"><label className="admin-image-url-field">Image URL<input type="url" value={value} placeholder="https://example.com/image.jpg" disabled={uploading} onChange={e=>{setFile(null);if(input.current)input.current.value="";setError("");onChange(e.target.value)}}/></label><div className="admin-image-upload"><div className="admin-image-preview">{previewSource?<img src={previewSource} alt="Selected image preview" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=imageFallback}}/>:<ImagePlus size={23}/>}</div><div className="admin-image-details"><strong>{filename||"No image selected"}</strong><small>{file?`${(file.size/1024/1024).toFixed(2)} MB · ready to upload`:value?"Current image":"Upload an image or enter a URL"}</small><div className="admin-image-actions"><input ref={input} className="admin-image-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif" disabled={uploading} onChange={e=>{setFile(e.target.files?.[0]||null);setError("")}}/><button type="button" className="admin-image-button" disabled={uploading} onClick={()=>input.current?.click()}>Choose File</button><button type="button" className="admin-image-button admin-image-upload-button" disabled={!file||uploading} onClick={upload}>{uploading?"Uploading…":"Upload Image"}</button>{(value||file)&&<button type="button" className="admin-image-remove" disabled={uploading} onClick={remove}>Remove</button>}</div></div></div>{error&&<p className="admin-image-error" role="alert">{error}</p>}</div>}
function PageHero({eyebrow,title,copy}){return <section className="page-hero"><div className="wrap"><div className="eyebrow"><span/> {eyebrow}</div><h1>{title}</h1><p>{copy}</p></div></section>}


function About() {
  return (
    <div id="about-page">

<PageHero
  eyebrow="A LITTLE ABOUT US"
  title={
    <AboutReactiveHeading
      level={1}
      firstLine="Learning is better"
      secondLine="when you belong."
    />
  }
  copy="A thoughtful approach to learning, built on strong foundations, personal guidance and the confidence to keep moving forward."
/>


      <section className="section wrap two-col about-philosophy">
        <img
          className="editorial-image"
          src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=85"
          alt="Students working together in a learning environment"
        />

        <div className="about-philosophy-content">
          <div className="eyebrow">
            <span /> OUR PHILOSOPHY
          </div>

<AboutReactiveHeading
  level={2}
  firstLine="Education that sees"
  secondLine="the whole learner."
/>

          <p className="body-copy">
            Every learner has different strengths, goals and ways of
            understanding. We believe meaningful progress begins with clear
            explanations, purposeful practice and an environment where
            questions are always welcome.
          </p>

          <div className="value-list">
            <p>
              <Check /> Thoughtful, learner-first guidance
            </p>
            <p>
              <Check /> Consistent practice and constructive feedback
            </p>
            <p>
              <Check /> A clear path from learning goals to action
            </p>
          </div>
        </div>
      </section>

      <section className="section section-soft about-values">
        <div className="wrap">
<SectionHeading
  eyebrow="WHAT GUIDES US"
  title={
    <AboutReactiveHeading
      level={2}
      firstLine="A few things we"
      secondLine="believe in."
    />
            }
            copy="The principles behind a more thoughtful, focused and encouraging learning experience."
          />

          <div className="value-grid">
            {[
              [
                "01",
                "Clarity",
                "Make every next step easier to understand and act on.",
              ],
              [
                "02",
                "Curiosity",
                "Welcome questions, explore ideas and learn by understanding.",
              ],
              [
                "03",
                "Consistency",
                "Build confidence through steady effort, practice and reflection.",
              ],
              [
                "04",
                "Care",
                "Treat every learner with patience, respect and encouragement.",
              ],
            ].map(([number, title, description]) => (
              <div className="value-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Courses({ content }) {
  return (
    <>
      <PageHero
        eyebrow="EXPLORE OUR PROGRAMMES"
        title={
          <AboutReactiveHeading
            level={1}
            firstLine="A course for your"
            secondLine="next chapter."
          />
        }
        copy="Explore learning programmes designed to strengthen understanding, build confidence and help every student take the next step towards their goals."
      />

      <section  id="courses-page" className="section wrap">
        <div className="course-grid course-grid-all">
          {content.courses.map((c, i) => (
            <CourseCard c={c} i={i} key={c._id || c.title} />
          ))}
        </div>

        <div className="inline-callout">
          <BookOpen />
          <div>
            <strong>Not sure where to start?</strong>
            <p>
              Tell us about your goals, and we'll help you find the right
              learning programme.
            </p>
          </div>
          <ButtonLink to="/contact">Ask a question</ButtonLink>
        </div>
      </section>
    </>
  );
}

function Faculty({content}){return <><PageHero eyebrow="MEET THE TEAM" title={
  <AboutReactiveHeading
    level={1}
    firstLine="Good teachers make"
    secondLine="space to grow."
  />
} copy="Meet the educators who make learning clearer, encourage curiosity and help every student grow with confidence."/>
<section id="faculty-page" className="section wrap">
  <div className="faculty-grid faculty-grid-all">
    {content.faculty.map((f,i)=><FacultyCard f={f} i={i} key={f._id||f.name}/>)}
    </div></section></>}





function Results({content}){return <><PageHero eyebrow="RESULTS & ACHIEVEMENTS" title={
  <AboutReactiveHeading
    level={1}
    firstLine="Celebrate progress."
    secondLine="Keep reaching."
  />
} copy="Every achievement reflects dedication, consistent effort and a commitment to learning. Discover the milestones that celebrate our learners' progress."/>
<section  id="results-page" className="section wrap">
  <div className="results-note"><ShieldCheck/><p>
    <strong>Transparency matters.</strong>
     We celebrate our learners’ progress, dedication and growth at every step of their educational journey.</p></div>
     <div className="result-grid">{content.results.map((r,i)=><Reveal className="result-card" key={r._id||r.name}>
      <span className="result-num">0{i+1}</span><strong>{r.score||"—"}</strong>
      <h3>{r.name||r.title}</h3><p>{r.role} · {r.year}</p><small>{r.description}</small></Reveal>)}</div>
      <div className="achievement-panel"><Award size={32}/><div>
        <h3>More than a score</h3><p>Recognise effort, consistency, personal improvement and achievements beyond exam results.</p></div></div>
        </section></>}


function Admissions(){return <><PageHero
  eyebrow="ADMISSIONS"
  title={
    <AboutReactiveHeading
      level={1}
      firstLine="Your next chapter"
      secondLine="starts right here."
    />
  }
  copy="A simple, welcoming process to help you explore course options and understand what to expect."
/><section id="admissions-page" className="section wrap"><div className="admission-timeline">{[["01","Start a conversation","Tell us about the learner, their goals and the kind of support they’re looking for."],["02","Explore the options","Discuss relevant sample programmes, learning expectations and schedule."],["03","Confirm the details","Review the information, availability and any required documents with the academy."],["04","Begin your journey","Get the joining information and a clear plan for the first session."]].map(([n,t,d])=><div key={n} className="timeline-item"><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}</div><div className="inline-callout"><GraduationCap/><div><strong>Have questions before applying?</strong><p>Send an enquiry and ask us about the next step.</p></div><ButtonLink to="/contact">Enquire now</ButtonLink></div></section></>}

function TestimonialCards({ testimonials }) {
  return (
    <div className="testimonial-grid">
      {testimonials.map((t, i) => {
        const name = t.name || t.title || "";
        const quote = t.quote || t.description || "";

        return (
          <Reveal
            className={`testimonial ${i === 1 ? "testimonial-featured" : ""}`}
            key={t._id || name || t.title}
          >
            <div className="stars" aria-label="Decorative stars">
              ★★★★★
            </div>

            <blockquote>“{quote}”</blockquote>

            <div className="testimonial-person">
              <span>
                {name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </span>

              <div>
                <strong>{name}</strong>
                <small>{t.role || "Student"}</small>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

function Testimonials({content}){return <><PageHero eyebrow="STUDENT STORIES · LEARNING EXPERIENCES" title={
  <AboutReactiveHeading
    level={1}
    firstLine="Every learner has"
    secondLine="a story to tell."
  />
} copy="Every learning journey is different. Discover how thoughtful guidance, consistent practice and the right support can help learners move forward with confidence."/><section className="section wrap"><div className="results-note"><ShieldCheck/><p><strong>Notice banner: </strong> Every learner’s journey is unique. These stories illustrate the values and learning experience we aim to create at Astratech.</p></div><TestimonialCards testimonials={content.testimonials}/><div className="section-end"><ButtonLink to="/courses">Explore courses</ButtonLink></div></section></>}

function Resources({content}){return <><PageHero
  eyebrow="THE LEARNING LIBRARY"
  title={
    <AboutReactiveHeading
      level={1}
      firstLine="A little more help"
      secondLine="for the journey."
    />
  }
  copy="Explore practical study guides, revision checklists and learning tips to help students stay organised, build confidence and make steady progress."
/><section id="resources-page" className="section wrap"><div className="resource-grid">{content.resources.map((r,i)=><Reveal className="resource-card" key={r._id||r.title} delay={i*.06}><div className="resource-card-icon"><BookMarked/></div><span>{r.category||r.type||"LEARNING RESOURCE"}</span><h3>{r.title}</h3><p>{r.description}</p><Link className="resource-action" to={resourcePath(r)}>View resource <ArrowUpRight size={15}/></Link></Reveal>)}</div></section></>}

function ResourceDetail({content,loading}){const {resourceId}=useParams();const resource=findByIdOrSlug(content.resources,resourceId);if(!resource&&loading)return <PageHero eyebrow="LEARNING RESOURCE" title="Loading resource…" copy="Please wait while this resource is loaded."/>;if(!resource)return <><PageHero eyebrow="RESOURCE NOT FOUND" title={<>Resource not<br/><em>available.</em></>} copy="This resource may have been removed or its link may be out of date."/><section className="section wrap"><ButtonLink to="/resources">Browse resources</ButtonLink></section></>;const candidate=resource.downloadUrl||resource.fileUrl||resource.url;const fileUrl=typeof candidate==="string"&&(/^(https?:\/\/|\/)/i).test(candidate)?candidate:null;return <><PageHero eyebrow={resource.category||resource.type||"LEARNING RESOURCE"} title={resource.title} copy={resource.description}/><section className="section wrap resource-detail"><div className="results-note"><BookMarked/><p><strong>{resource.category||resource.type||"Sample resource"}</strong><br/>{resource.sample===false?"Resource details are provided by the academy.":"Demo resource content. Replace with approved material before publication."}</p></div>{fileUrl?<div className="resource-download"><p>An approved file is available for this resource.</p><a className="btn btn-dark" href={fileUrl} target="_blank" rel="noreferrer">View resource <ArrowUpRight size={16}/></a><a className="btn btn-light" href={fileUrl} download>Download resource <Download size={16}/></a></div>:<p className="resource-unavailable">No approved file is attached to this resource yet.</p>}<div className="section-end"><ButtonLink to="/resources">Back to resources</ButtonLink></div></section></>}
function Notices({ content }) {
  return (
    <>
      <PageHero
        eyebrow="WHAT'S HAPPENING"
        title={
          <AboutReactiveHeading
            level={1}
            firstLine="News, notes &"
            secondLine="noteworthy things."
          />
        }
        copy="Stay up to date with academy announcements, upcoming events and useful learning resources."
      />

      <section className="section wrap">
        <div className="notice-list notice-list-page">
          {content.notices.map((n, i) => (
            <div className="notice-row" key={n._id || n.title}>
              <span className="notice-index">0{i + 1}</span>
              <div>
                <small>{n.type || n.category}</small>
                <h3>{n.title}</h3>
                <p>{n.description}</p>
              </div>
              <span className="notice-date">
                <CalendarDays size={14} />
                {n.date || "Date to be announced"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Careers() {
  return (
    <>
      <PageHero
        eyebrow="CAREERS"
        title={
          <AboutReactiveHeading
            level={1}
            firstLine="Help learners find"
            secondLine="their potential."
          />
        }
        copy="We bring together thoughtful educators and passionate professionals who believe in helping every learner grow, build confidence and achieve their goals."
      />

      <section className="section wrap two-col">
        <div>
          <div className="eyebrow">
            <span /> WORK WITH US
          </div>

          <h2>
            Good work starts
            <br />
            with <em>good people.</em>
          </h2>

          <p className="body-copy">
            We value patient teaching, curiosity, reliability and a
            student-first mindset. If you share these values and would
            like to contribute to a supportive learning environment,
            we’d love to hear from you.
          </p>

          <ButtonLink to="/contact">Express interest</ButtonLink>
        </div>

        <div className="career-card">
          <span>
            <Users />
          </span>

          <h3>No live vacancies listed</h3>

          <p>
            There are currently no open positions. We welcome
            introductions from educators and professionals interested
            in future opportunities with our academy.
          </p>
        </div>
      </section>
    </>
  );
}

function FAQs() {

const faqs = [
  [
    "Which courses are available?",
    "We offer learning programmes designed to support students at different stages of their academic journey. Visit our Courses page to explore the available programmes and find one that aligns with your learning goals."
  ],
  [
    "How do I enquire about admission?",
    "Getting started is simple. Visit our Contact page and submit the enquiry form with your name, contact details and area of interest. Our team will help you understand the admission process and guide you through the next steps."
  ],
  [
    "Can I access study resources online?",
    "Students can refer to the learning materials and resources made available for their respective programmes. For details about specific study materials, please get in touch with our team."
  ],
  [
    "How can I choose the right course?",
    "Start by considering your academic goals, current understanding and the subjects you would like to strengthen. Our team can help you explore suitable programmes and make an informed choice."
  ],
  [
    "How can I contact the academy?",
    "You can reach us through the enquiry form on our Contact page. Share your question or requirements, and our team will assist you with the information you need."
  ]
];

  return (
    <>
      <PageHero
        eyebrow="FREQUENTLY ASKED QUESTIONS"
        title={
          <AboutReactiveHeading
            level={1}
            firstLine="A few answers"
            secondLine="to help you begin."
          />
        }
        copy="Find helpful answers about our courses, learning approach, admissions and student support. If you need more information, our team will be happy to guide you."
      />

      <section className="section wrap faq-page">
        <div className="faq-side">
          <CircleHelp size={36} />
          <h2>Still curious?</h2>
          <p>We’re happy to help you find the information you need.</p>
          <ButtonLink to="/contact">Contact us</ButtonLink>
        </div>

        <div className="faq-list">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function Contact({content}){const [form,setForm]=useState({name:"",phone:"",email:"",course:"",message:""});const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);const contact=content.contact||DEFAULT_CONTACT_SETTINGS;const submitting=useRef(false);async function submit(e){e.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setStatus("");try{const result=await api("/enquiries",{method:"POST",body:JSON.stringify(form)});setStatus(result.message||"Demo enquiry submitted.");setForm({name:"",phone:"",email:"",course:"",message:""})}catch(err){setStatus(`${err.message} (Start the API and connect MongoDB Atlas to save enquiries.)`)}finally{submitting.current=false;setBusy(false)}}return <>
<PageHero
  eyebrow="GET IN TOUCH"
  title={
    <AboutReactiveHeading
      level={1}
      firstLine="Let's start with"
      secondLine="a conversation."
    />
  }
  copy="Have a question about our programmes? Tell us what you're looking for, and we'll help you explore the next step in your learning journey."
/>
<section className="section wrap contact-layout"><div className="contact-details"><h2>{contact.heading}</h2>
<p className="body-copy">
  Have a question about our programmes? Tell us what you're looking for,
  and we'll help you explore the next step in your learning journey.
</p>
<div className="contact-detail"><Mail/><div><small>EMAIL</small><a href={`mailto:${contact.email}`}><strong>{contact.email}</strong></a></div></div><div className="contact-detail"><Phone/><div><small>PHONE</small><a href={`tel:${contact.phone.replace(/[^+\d]/g,"")}`}><strong>{contact.phone}</strong></a></div></div><div className="contact-detail"><MapPin/><div><small>LOCATION</small><strong>{contact.address}</strong></div></div>{contact.officeHours&&<div className="contact-detail"><Clock3/><div><small>OFFICE HOURS</small><strong>{contact.officeHours}</strong></div></div>}{contact.mapUrl?<iframe className="contact-map-embed" src={contact.mapUrl} title="Academy location map" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>:<div className="contact-map">ASTRRATECH <span>LEARNING ACADEMY</span><MapPin size={30}/><small>Location map not configured</small></div>}</div><form className="contact-form" onSubmit={submit}><div className="form-heading"><h3>Send an enquiry</h3><p>Fields marked * are required.</p></div><div className="form-two"><label>Full name *<input required minLength="2" maxLength="100" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name"/></label><label>Phone number *<input required pattern={"[0-9+\\(\\)\\s\\-]{8,30}"} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210"/></label></div><label>Email address<input type="email" maxLength="160" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Course of interest *<select required value={form.course} onChange={e=>setForm({...form,course:e.target.value})}><option value="">Choose a course</option>{content.courses.map(c=><option key={c._id||c.title}>{c.title}</option>)}</select></label><label>Message<textarea rows="4" maxLength="1500" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="What would you like to know?"/></label><button className="btn btn-dark submit-btn" disabled={busy}>{busy?<LoaderCircle className="spin"/>:"Submit enquiry"} {!busy&&<ArrowUpRight size={16}/>}</button>{status&&<p className="form-status" role="status">{status}</p>}<small className="form-footnote">Our team will follow up using the contact details you provide.</small></form></section></>}


function Policy({ terms = false }) {
  const privacySections = [
    [
      "Information you share",
      "When you contact Astratech Learning Academy, you may be asked to provide details such as your name, phone number, email address, programme of interest and enquiry message."
    ],
    [
      "How your information is used",
      "The information you provide helps our team respond to your questions, share relevant programme information and assist you with admission-related enquiries."
    ],
    [
      "Your privacy and choices",
      "Please share only the information needed for your enquiry. For questions about your personal information or requests to update or correct your details, please contact the academy directly."
    ]
  ];

  const termsSections = [
    [
      "Programme information",
      "Course details, schedules and programme requirements should be confirmed directly with the academy before enrolment."
    ],
    [
      "Admissions and fees",
      "Admission eligibility, applicable fees, payment schedules and required documentation will be communicated by the academy during the admission process."
    ],
    [
      "Cancellations and refunds",
      "Any applicable cancellation, withdrawal or refund conditions should be confirmed with the academy before making a payment."
    ]
  ];

  const sections = terms ? termsSections : privacySections;

  return (
    <>
      <PageHero
        eyebrow={terms ? "TERMS & REFUND POLICY" : "PRIVACY POLICY"}

title={
  terms ? (
    <AboutReactiveHeading
      key="terms-heading"
      level={1}
      firstLine="Clear expectations,"
      secondLine="thoughtfully stated."
    />
  ) : (
    <AboutReactiveHeading
      key="privacy-heading"
      level={1}
      firstLine="Your information"
      secondLine="deserves care."
    />
  )
}

        copy={
          terms
            ? "Understand the key information about programmes, admissions, fees and related policies before you enrol."
            : "Your trust matters to us. Learn how the information you share with Astratech Learning Academy supports your enquiries and communication with our team."
        }
      />

      <section className="section wrap policy-copy">
        <h2>
          {terms ? "Terms and admission information" : "Your privacy matters"}
        </h2>

        {sections.map(([heading, description]) => (
          <div key={heading}>
            <h3>{heading}</h3>
            <p>{description}</p>
          </div>
        ))}
      </section>
    </>
  );
}


function Admin(){const {pathname:adminPath}=useLocation();const [sessionRetry,setSessionRetry]=useState(0);const [sessionError,setSessionError]=useState("");const [token,setToken]=useState(()=>getAdminEntrySession(localStorage,adminPath));useEffect(()=>{function openLogin(){beginAdminLoginEntry(localStorage);setToken("");setSessionReady(true);setItems([]);setEnquiries([]);setSessionError("")}window.addEventListener("astratech:admin-login-entry",openLogin);return()=>window.removeEventListener("astratech:admin-login-entry",openLogin)},[]);const [sessionReady,setSessionReady]=useState(()=>!getAdminSession(localStorage.getItem("astratech_admin_token")));const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [searchParams,setSearchParams]=useSearchParams();const [section,setSectionState]=useState(()=>getAdminSection(searchParams.toString(),adminPath));function setSection(next){const sectionValue=getAdminSection(`?section=${encodeURIComponent(next)}`);setSectionState(sectionValue);const nextParams=new URLSearchParams(searchParams);nextParams.set("section",sectionValue);setSearchParams(nextParams,{replace:true})}const [refreshing,setRefreshing]=useState([]);const requests=useRef(new Map());const sectionRef=useRef(section);sectionRef.current=section;const [items,setItems]=useState([]);const [contactForm,setContactForm]=useState(DEFAULT_CONTACT_SETTINGS);const [contactLoaded,setContactLoaded]=useState(false);const [enquiries,setEnquiries]=useState([]);const [overviewCounts,setOverviewCounts]=useState({});const [busy,setBusy]=useState(false);const [editId,setEditId]=useState("");const [form,setForm]=useState({title:"",category:"",duration:"",icon:"✳",description:"",name:"",role:"",qualification:"",image:"",year:"",score:"",quote:"",type:"Notice",date:"",featured:false});function throwIfNotArray(data,target){if(!Array.isArray(data))throw new Error(target+" endpoint did not return a list.")}const contentTypes=[["courses","Courses"],["faculty","Faculty"],["results","Results"],["testimonials","Testimonials"],["notices","Notices"],["resources","Resources"]];async function loadItems(s=section){const requestId=(requests.current.get(s)||0)+1;requests.current.set(s,requestId);setRefreshing(old=>old.includes(s)?old:[...old,s]);setError("");try{const targets=s==="overview"?ADMIN_OVERVIEW_SECTIONS:[s];const entries=s==="contact"?[["contact",await api(getAdminDataPath(s))]]:await Promise.all(targets.map(async target=>{const data=await api(getAdminDataPath(target));throwIfNotArray(data,target);return [target,data]}));if(requests.current.get(s)===requestId&&sectionRef.current===s){if(s==="overview")setOverviewCounts(Object.fromEntries(entries.map(([target,data])=>[target,data.length])));else if(s==="enquiries")setEnquiries(entries[0][1]);else if(s==="contact"){setContactForm({...DEFAULT_CONTACT_SETTINGS,...entries[0][1]});setContactLoaded(true);}else setItems(entries[0][1]);}return entries.length===1?entries[0][1]:Object.fromEntries(entries);}catch(e){if(requests.current.get(s)===requestId&&sectionRef.current===s){if(s==="contact")setContactLoaded(false);setError("Could not refresh "+s+": "+e.message)}return null}finally{if(requests.current.get(s)===requestId)setRefreshing(old=>old.filter(x=>x!==s))}}useEffect(()=>{if(!token){setSessionReady(true);setSessionError("");return}let active=true;setSessionReady(false);setSessionError("");api("/admin/enquiries").then(()=>{if(active)setSessionReady(true)}).catch(e=>{if(!active)return;if(isAdminSessionInvalid(e.status)){localStorage.removeItem("astratech_admin_token");setToken("");setError("Your admin session is invalid or expired. Please sign in again.")}else{setSessionError("Could not verify admin session: "+e.message)}});return()=>{active=false}},[token,sessionRetry]);useEffect(()=>{if(token&&sessionReady)loadItems(section)},[token,sessionReady,section]);useEffect(()=>{setSectionState(getAdminSection(searchParams.toString(),adminPath))},[searchParams,adminPath]);async function login(e){e.preventDefault();setBusy(true);setError("");try{const d=await api("/admin/login",{method:"POST",body:JSON.stringify({email,password})});localStorage.setItem("astratech_admin_token",d.token);setToken(d.token)}catch(e){setError(e.message)}finally{setBusy(false)}}function resetForm(){setEditId("");setForm({title:"",category:"",duration:"",icon:"✳",description:"",name:"",role:"",qualification:"",image:"",year:"",score:"",quote:"",type:"Notice",date:"",featured:false})}function edit(item){setEditId(item._id);setForm(buildAdminEditForm(section,item,form));window.scrollTo({top:0,behavior:"smooth"})}async function saveItem(e){e.preventDefault();setBusy(true);setError("");try{const payload=buildAdminPayload(section,form);const d=await api(`/admin/${section}${editId?`/${editId}`:""}`,{method:editId?"PUT":"POST",body:JSON.stringify(payload)});setItems(old=>editId?replaceAdminRecord(old,d):[d,...old]);resetForm();await loadItems(section)}catch(e){setError(e.message)}finally{setBusy(false)}}async function remove(id){if(!confirm("Delete this item?"))return;try{await api(`/admin/${section}/${id}`,{method:"DELETE"});setItems(old=>old.filter(x=>x._id!==id));await loadItems(section)}catch(e){setError(e.message)}}function logout(){localStorage.removeItem("astratech_admin_token");setToken("");setSessionReady(true);setItems([])}if(token&&!sessionReady)return <div className="admin-login-page"><div className="admin-login-card"><p role="status">{sessionError||"Checking admin session?"}</p>{sessionError&&<><button className="btn btn-dark submit-btn" onClick={()=>setSessionRetry(value=>value+1)}>Retry verification</button><button className="admin-image-button" onClick={()=>{localStorage.removeItem("astratech_admin_token");setToken("");setSessionError("");setError("")}}>Sign in instead</button></>}</div></div>;if(!token)return <div className="admin-login-page"><div className="admin-login-card"><Link className="brand" to="/"><span className="brand-icon">A<span>✦</span></span><span className="brand-name">astrratech<small>LEARNING ACADEMY</small></span></Link><div className="eyebrow"><span/> CONTENT STUDIO</div><h1>Welcome<br/><em>back.</em></h1><p>Sign in to manage the sample academy website content.</p><form onSubmit={login}><label>Admin email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="btn btn-dark submit-btn" disabled={busy}>{busy?"Signing in…":"Sign in"} <ArrowUpRight size={16}/></button>{error&&<p className="form-status">{error}</p>}</form><div className="login-demo-note"><ShieldCheck size={16}/><span>Sign in with the administrator credentials configured for this deployment.</span></div><Link className="underlink" to="/">← Back to website</Link></div></div>;
if(!isKnownAdminPath(adminPath))return <NotFound/>;return <div className="admin-shell"><aside className="admin-sidebar"><Link className="brand brand-light" to="/"><span className="brand-icon">A<span>✦</span></span><span className="brand-name">astrratech<small>LEARNING ACADEMY</small></span></Link><div className="admin-label">WORKSPACE</div><button className={section==="overview"?"admin-nav active":"admin-nav"} onClick={()=>setSection("overview")}><LayoutDashboard size={16}/>Overview</button><button className={section==="contact"?"admin-nav active":"admin-nav"} onClick={()=>setSection("contact")}><MapPin size={16}/>Get in Touch</button>{contentTypes.map(([k,label])=><button key={k} className={section===k?"admin-nav active":"admin-nav"} onClick={()=>setSection(k)}><LayoutDashboard size={16}/>{label}</button>)}<button className={section==="enquiries"?"admin-nav active":"admin-nav"} onClick={()=>setSection("enquiries")}><MessageSquare size={16}/>Enquiries</button><div className="admin-sidebar-bottom"><Link to="/"><ArrowRight size={15}/> View website</Link><button onClick={logout}><LogOut size={15}/> Sign out</button></div></aside><main className="admin-main"><div className="admin-topbar"><div><span>ASTRRATECH / CONTENT STUDIO</span><h1>{section==="overview"?"Overview":section==="enquiries"?"Enquiries":section==="contact"?"Get in Touch":contentTypes.find(x=>x[0]===section)?.[1]}</h1></div><span className="admin-user"><span>AD</span> Admin demo</span></div>{error&&<div className="admin-alert">{error}<button onClick={()=>setError("")}>×</button></div>}{section==="overview"?<section className="admin-list-card"><div className="admin-card-heading"><div><span className="eyebrow"><span/> WORKSPACE</span><h2>Manage academy content</h2></div></div><p className="body-copy">Choose a section to view, create, and update academy content.</p><div className="admin-overview-links">{contentTypes.map(([key,label])=><button type="button" key={key} className="admin-entry admin-overview-link" onClick={()=>setSection(key)}><span className="admin-entry-avatar"><LayoutDashboard size={16}/></span><span className="admin-entry-copy"><strong>{label}</strong><small>{overviewCounts[key]??"?"} records ? Manage {label.toLowerCase()}</small></span><ArrowRight size={15}/></button>)}<button type="button" className="admin-entry admin-overview-link" onClick={()=>setSection("enquiries")}><span className="admin-entry-avatar"><MessageSquare size={16}/></span><span className="admin-entry-copy"><strong>Enquiries</strong><small>{overviewCounts.enquiries??"?"} enquiries ? Manage student enquiries</small></span><ArrowRight size={15}/></button></div></section>:section==="contact"?<ContactSettingsEditor contact={contactForm} loading={refreshing.includes(section)} loaded={contactLoaded} loadError={error.startsWith("Could not refresh contact:")?error:""} onRefresh={()=>loadItems(section)} onSaved={setContactForm}/>:section!=="enquiries"?<div className="admin-workspace"><section className="admin-edit-card"><div className="admin-card-heading"><div><span className="eyebrow"><span/> {editId?"EDIT ENTRY":"CONTENT EDITOR"}</span><h2>{editId?"Update content":"Create new content"}</h2></div>{editId&&<button className="plain-button" onClick={resetForm}>Cancel edit</button>}</div><form className="admin-content-form" onSubmit={saveItem}>{["courses","notices","resources"].includes(section)&&<><label>Title *<input required maxLength="140" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="form-two"><label>Category<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>{section==="courses"?"Duration":"Type"}<input value={section==="courses"?form.duration:form.type} onChange={e=>setForm({...form,[section==="courses"?"duration":"type"]:e.target.value})}/></label></div>{section==="courses"&&<label>Icon / symbol<input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})}/></label>}</>}{section==="faculty"&&<><label>Full name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Role *<input required maxLength="140" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></label><label>Qualification / experience<input value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})}/></label><label>Faculty biography *<textarea required rows="4" maxLength="1200" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><AdminImageField value={form.image} onChange={image=>setForm({...form,image})}/></>}{section==="results"&&<><label>Learner label *<input required maxLength="140" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Programme / role *<input required maxLength="500" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></label><div className="form-two"><label>Year<input maxLength="20" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>Score / achievement *<input required maxLength="500" value={form.score} onChange={e=>setForm({...form,score:e.target.value})}/></label></div></>}{section==="testimonials"&&<><label>Display name *<input required maxLength="140" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Role / label<input value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></label><label>Testimonial quote *<textarea required maxLength="1200" rows="3" value={form.quote} onChange={e=>setForm({...form,quote:e.target.value})}/></label></>}{section!=="faculty"&&section!=="results"&&section!=="testimonials"&&<label>Description *<textarea required rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>}{section==="notices"&&<label>Date / timing label<input value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>}<label className="check-label"><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Feature this entry</label><button className="btn btn-dark submit-btn" disabled={busy}>{busy?"Saving…":editId?"Save changes":"Add to website"} <ArrowUpRight size={16}/></button></form></section><section className="admin-list-card"><div className="admin-card-heading"><div><span className="eyebrow"><span/> PUBLISHED CONTENT</span><h2>{items.length} entries</h2></div><button type="button" className="icon-button" onClick={()=>loadItems(section)} aria-label={section==="enquiries"?"Refresh Enquiries":"Refresh Published Content"} aria-busy={refreshing.includes(section)}>{refreshing.includes(section)?<LoaderCircle className="spin" size={17}/>:<LoaderCircle size={17}/>}</button></div>{items.length===0?<p className="empty-state">No content found. Check MongoDB connection and seed data.</p>:items.map(item=><div className="admin-entry" key={item._id}><div className="admin-entry-avatar">{section==="faculty"&&item.image?<img src={imageUrl(item.image)||imageFallback} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=imageFallback}} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6}}/>:(section==="faculty"?(item.name||item.title):(item.title||item.name)||"?").slice(0,1)}</div><div className="admin-entry-copy"><strong>{section==="faculty"?(item.name||item.title):(item.title||item.name)}</strong><small>{section==="faculty"?[item.role,item.qualification,item.featured?"Featured":"Not featured"].filter(Boolean).join(" · "):`${item.category||item.role||item.type||"Content"} ${item.sample!==false?" · Demo data":""}`}</small></div><button className="icon-button" onClick={()=>edit(item)} aria-label="Edit"><Pencil size={15}/></button><button className="icon-button danger" onClick={()=>remove(item._id)} aria-label="Delete"><Trash2 size={15}/></button></div>)}</section></div>:<EnquiryInbox enquiries={enquiries} loading={refreshing.includes(section)} onRefresh={()=>loadItems(section)} onUpdated={saved=>setEnquiries(old=>old.map(item=>String(item._id)===String(saved._id)?saved:item))} />}</main></div>}
function CareersPage(){return <Careers/>}
function NotFound(){return <><PageHero eyebrow="PAGE NOT FOUND" title={<>Let's get you<br/><em>back on track.</em></>} copy="The page you're looking for doesn't exist in this demo."/><section className="section wrap"><ButtonLink to="/">Back to Home</ButtonLink></section></>}
function ScrollToTop(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0)},[pathname]);return null}
export default function App(){const {content,refresh,loading}=useContent();const {pathname}=useLocation();const adminRoute=isAdminEntryPath(pathname);return <><ScrollToTop/>{!adminRoute&&<><PublicCursor/><Header/></>}<AnimatePresence mode="wait"><Routes><Route path="/" element={<Home content={content}/>}/><Route path="/about" element={<About/>}/><Route path="/courses" element={<Courses content={content}/>}/><Route path="/courses/:courseId" element={<CourseDetail content={content} loading={loading}/>}/><Route path="/faculty" element={<Faculty content={content}/>}/><Route path="/results" element={<Results content={content}/>}/><Route path="/admissions" element={<Admissions/>}/><Route path="/resources" element={<Resources content={content}/>}/><Route path="/resources/:resourceId" element={<ResourceDetail content={content} loading={loading}/>}/><Route path="/testimonials" element={<Testimonials content={content}/>}/><Route path="/notices" element={<Notices content={content}/>}/><Route path="/careers" element={<CareersPage/>}/><Route path="/faq" element={<FAQs/>}/><Route path="/contact" element={<Contact content={content}/>}/><Route path="/privacy" element={<Policy/>}/><Route path="/terms" element={<Policy terms/>}/><Route path="/staff-access/*" element={<Admin/>}/><Route path="/admin/*" element={<NotFound/>}/><Route path="*" element={<NotFound/>}/></Routes></AnimatePresence>{!adminRoute&&<Footer contact={content.contact}/>}</>}
