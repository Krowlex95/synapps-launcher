use serde::{Deserialize, Serialize};

/// High-level categorization of applications in the ArtCraft catalog.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AppCategory {
    #[serde(rename = "design", alias = "Design")]
    Design,
    #[serde(rename = "media", alias = "Media")]
    Media,
    #[serde(rename = "office", alias = "Office")]
    Office,
    #[serde(rename = "3d", alias = "ThreeD", alias = "Engineering")]
    ThreeD,
    #[serde(rename = "dev", alias = "Dev")]
    Dev,
}

/// Metadata describing an application in the ArtCraft catalog.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub repo: String,
    pub category: AppCategory,
    pub developer_id: String,
    pub developer: String,
    pub icon_url: Option<String>,
}

/// Installation and availability status of an application.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppStatus {
    NotInstalled,
    Installed,
    UpdateAvailable,
    Installing,
    Downloading,
}

/// Dynamic synchronization state for an application.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStateInfo {
    #[serde(alias = "app_id")]
    pub app_id: String,
    #[serde(alias = "installed_version")]
    pub installed_version: Option<String>,
    #[serde(alias = "latest_version")]
    pub latest_version: Option<String>,
    pub status: AppStatus,
}

/// On-disk installation manifest recorded in `{install_dir}/{app_id}/manifest.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppManifest {
    pub app_id: String,
    pub version: String,
    pub installed_at: String,
    pub executable_path: String,
    pub asset_name: String,
}

fn app(
    id: &str,
    name: &str,
    description: &str,
    repo: &str,
    category: AppCategory,
    developer_id: &str,
    developer: &str,
) -> AppInfo {
    AppInfo {
        id: id.to_string(),
        name: name.to_string(),
        description: description.to_string(),
        repo: repo.to_string(),
        category,
        developer_id: developer_id.to_string(),
        developer: developer.to_string(),
        icon_url: Some(format!("/icons/apps/{}.png", id)),
    }
}

/// Returns the catalog of all 36 creative, 3D, dev & productivity applications.
pub fn get_app_catalog() -> Vec<AppInfo> {
    vec![
        // --- Design ---
        app("photocraft", "PhotoCraft", "Professional raster image editing, non-destructive layer composition, and digital painting studio.", "photocraft", AppCategory::Design, "artcraft", "ArtCraft"),
        app("vectorcraft", "VectorCraft", "Precision vector illustration and graphic design workbench for logos, icons, typography, and web assets.", "vectorcraft", AppCategory::Design, "artcraft", "ArtCraft"),
        app("designcraft", "DesignCraft", "Advanced page layout and desktop publishing application for print publications, digital magazines, and eBooks.", "designcraft", AppCategory::Design, "artcraft", "ArtCraft"),
        app("figcraft", "FigCraft", "Collaborative UI/UX design, wireframing, and interactive prototyping tool with atomic design system support.", "figcraft", AppCategory::Design, "artcraft", "ArtCraft"),
        app("gimp", "GIMP", "Professional raster image editor for photo retouching, image composition, and graphic design.", "GNOME/gimp", AppCategory::Design, "gimp", "GIMP Team"),
        app("krita", "Krita", "Professional digital painting, concept art, illustration, and 2D frame-by-frame animation studio.", "KDE/krita", AppCategory::Design, "kde", "KDE"),
        app("graphite", "Graphite", "Procedural 2D vector and raster graphics editor powered by a node graph compositing engine.", "GraphiteEditor/Graphite", AppCategory::Design, "graphite", "Graphite"),
        app("pixelorama", "Pixelorama", "Complete 2D sprite, pixel art, tilemap, and frame-by-frame animation studio.", "Orama-Interactive/Pixelorama", AppCategory::Design, "orama", "Orama Interactive"),
        app("pencil2d", "Pencil2D", "Intuitive hand-drawn 2D traditional animation software with bitmap and vector workflows.", "pencil2d/pencil", AppCategory::Design, "pencil2d", "Pencil2D"),
        app("upscayl", "Upscayl", "AI-powered local image upscaler that enhances low-resolution images without losing detail.", "upscayl/upscayl", AppCategory::Design, "upscayl", "Upscayl"),
        app("fontforge", "FontForge", "Professional outline and bitmap font editor supporting OpenType, TrueType, PostScript, and SVG.", "fontforge/fontforge", AppCategory::Design, "fontforge", "FontForge"),
        app("imageglass", "ImageGlass", "Lightweight, versatile image viewer designed for seamless inspection of 80+ formats including PSD, SVG, RAW, and HEIC.", "d2phap/ImageGlass", AppCategory::Design, "imageglass", "ImageGlass"),
        app("librecad", "LibreCAD", "Lightweight 2D CAD application for technical drawings, floor plans, and DXF/DWG schematics.", "LibreCAD/LibreCAD", AppCategory::Design, "librecad", "LibreCAD"),

        // --- Media ---
        app("lightcraft", "LightCraft", "Comprehensive RAW photo development, color grading workflow, and digital photo library manager.", "lightcraft", AppCategory::Media, "artcraft", "ArtCraft"),
        app("filmcraft", "FilmCraft", "High-performance non-linear video editing suite with multi-track timeline, keyframing, and cinema-grade color wheels.", "filmcraft", AppCategory::Media, "artcraft", "ArtCraft"),
        app("effectcraft", "EffectCraft", "Motion graphics, node-based visual effects compositing, 3D camera tracking, and procedural particle generator.", "effectcraft", AppCategory::Media, "artcraft", "ArtCraft"),
        app("soundcraft", "SoundCraft", "Digital audio workstation featuring multi-track recording, spectral audio restoration, and mastering suite.", "soundcraft", AppCategory::Media, "artcraft", "ArtCraft"),
        app("obs", "OBS Studio", "Industry-standard software for high-performance screen recording, scene composition, and live streaming.", "obsproject/obs-studio", AppCategory::Media, "obs", "OBS Project"),
        app("shotcut", "Shotcut", "Cross-platform non-linear video editor supporting hundreds of audio/video formats and 4K timelines.", "mltframework/shotcut", AppCategory::Media, "meltytech", "Meltytech"),
        app("losslesscut", "LosslessCut", "Swiss army knife for ultrafast, lossless trimming and cutting of video and audio files without re-encoding.", "mifi/lossless-cut", AppCategory::Media, "mifi", "Mifi"),
        app("audacity", "Audacity", "Multi-track audio editor and recorder with real-time effects, spectrogram analysis, and plugin support.", "audacity/audacity", AppCategory::Media, "muse", "Muse Group"),
        app("lmms", "LMMS", "Digital audio workstation for music production, beat creation, synthesizer sequencing, and mixing.", "LMMS/lmms", AppCategory::Media, "lmms", "LMMS"),
        app("sharex", "ShareX", "Advanced screen capture, annotation, color picker, and GIF/video recording workflow tool.", "ShareX/ShareX", AppCategory::Media, "sharex", "ShareX Team"),

        // --- Office ---
        app("wordcraft", "WordCraft", "Modern, distraction-free document processor with intelligent typesetting, markdown interoperability, and review tools.", "wordcraft", AppCategory::Office, "artcraft", "ArtCraft"),
        app("deckcraft", "DeckCraft", "Visual presentation designer with interactive canvas transitions, slide choreography, and presenter teleprompter.", "deckcraft", AppCategory::Office, "artcraft", "ArtCraft"),
        app("gridcraft", "GridCraft", "Reactive spreadsheet and analytical data platform with array formulas, pivot summaries, and chart generation.", "gridcraft", AppCategory::Office, "artcraft", "ArtCraft"),
        app("pdfcraft", "PdfCraft", "Comprehensive PDF management tool for editing text, merging, splitting, digital signing, and OCR document conversion.", "pdfcraft", AppCategory::Office, "artcraft", "ArtCraft"),
        app("appflowy", "AppFlowy", "Privacy-first open-source workspace for notes, wikis, kanban boards, and databases built with Rust and Flutter.", "AppFlowy-IO/AppFlowy", AppCategory::Office, "appflowy", "AppFlowy"),
        app("affine", "AFFiNE", "All-in-one knowledge base uniting structured documents, kanban planning, and infinite edgeless whiteboards.", "toeverything/AFFiNE", AppCategory::Office, "toeverything", "ToEverything"),
        app("onlyoffice", "ONLYOFFICE", "Full-featured office suite for text documents, spreadsheets, presentations, and fillable PDF forms.", "ONLYOFFICE/DesktopEditors", AppCategory::Office, "onlyoffice", "ONLYOFFICE"),

        // --- 3D ---
        app("cadcraft", "CADCraft", "Parametric 3D computer-aided design (CAD) and engineering modeling environment with assembly constraints and technical drafting.", "cadcraft", AppCategory::ThreeD, "artcraft", "ArtCraft"),
        app("blender", "Blender", "Complete 3D creation suite for modeling, sculpting, animation, rigging, VFX, simulation, and rendering.", "blender/blender", AppCategory::ThreeD, "blender", "Blender Foundation"),
        app("blockbench", "Blockbench", "Low-poly 3D model editor with UV mapping, pixel painting, and keyframe animation.", "JannisX11/blockbench", AppCategory::ThreeD, "blockbench", "JannisX11"),
        app("freecad", "FreeCAD", "Parametric 3D CAD/CAM/CAE modeler for mechanical engineering, BIM architecture, and finite element analysis.", "FreeCAD/FreeCAD", AppCategory::ThreeD, "freecad", "FreeCAD"),
        app("orcaslicer", "OrcaSlicer", "Advanced 3D printing G-code slicer with calibration tools, tree supports, and multi-printer management.", "SoftFever/OrcaSlicer", AppCategory::ThreeD, "softfever", "SoftFever"),
        app("prusaslicer", "PrusaSlicer", "Reliable 3D model slicing and preparation tool for FFF/FDM and SLA/MSLA 3D printers.", "prusa3d/PrusaSlicer", AppCategory::ThreeD, "prusa", "Prusa Research"),
        app("dust3d", "Dust3D", "Quick 3D watertight mesh modeling, auto-rigging, and UV unwrapping tool for game and design assets.", "huxingyi/dust3d", AppCategory::ThreeD, "dust3d", "Dust3D"),

        // --- Dev ---
        app("godot", "Godot Engine", "Feature-packed, cross-platform 2D and 3D engine for interactive simulations, visualization, and game development.", "godotengine/godot", AppCategory::Dev, "godot", "Godot Foundation"),
        app("superproductivity", "Super Productivity", "Developer-focused task manager, time tracker, and daily planner with native GitHub, GitLab, and Jira integration.", "johannesjo/super-productivity", AppCategory::Dev, "superproductivity", "Johannes Millan"),
    ]
}
