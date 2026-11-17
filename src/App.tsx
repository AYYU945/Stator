import { useState, useEffect, useRef } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Sidebar, NAV_ITEMS } from './components/layout/Sidebar.tsx';
import { TopBar } from './components/layout/TopBar.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { ProjectsView } from './components/ProjectsView.tsx';
import { StatorStudio } from './components/studio/StatorStudio.tsx';
import { ExportCenterModal } from './components/studio/ExportCenterModal.tsx';
import { GifStudioPanel } from './components/GifStudioPanel.tsx';
import { QualityLabView } from './components/QualityLabView.tsx';
import { SmartPipelinesView } from './components/SmartPipelinesView.tsx';
import { HistoryWorkspaceView } from './components/HistoryWorkspaceView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { GuideWorkspaceView } from './components/GuideWorkspaceView.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { PresetModal } from './components/PresetModal.tsx';
import { NewProjectModal } from './components/NewProjectModal.tsx';
import { ToolsDirectoryModal } from './components/ToolsDirectoryModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { StatusFooter } from './components/StatusFooter.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import { CopyrightNotice } from './components/CopyrightNotice.tsx';
import { LegalRoute, legalRouteToPath, parseLegalRoute } from './lib/links.ts';
import { buildOutputFilename } from './utils/formatCapabilities.ts';
import { useTheme } from './lib/theme.ts';
import { useStatorSettings } from './lib/settingsStore.ts';
import { STATOR_TRANSITION } from './lib/motion.ts';
import { NavToolId } from './types/settings.ts';
import { ProjectType } from './types/project.ts';
import { useConversionQueue } from './hooks/useConversionQueue.ts';
import { useProjectWorkspace } from './hooks/useProjectWorkspace.ts';
import { isPipelineCompatibleWithCategory } from './lib/pipelineRecipes.ts';

const STUDIO_TOOL_IDS = new Set<NavToolId>([
  'converter',
  'compressor',
  'video',
  'images',
  'audio',
  'batch',
]);

const VIEW_TITLES: Record<NavToolId, string> = {
  home: 'Home',
  projects: 'Projects',
  history: 'History',
  converter: 'Converter Studio',
  compressor: 'Compressor',
  video: 'Video Studio',
  images: 'Image Studio',
  audio: 'Audio Studio',
  'gif-studio': 'GIF & Animation',
  batch: 'Batch Queue',
  'quality-lab': 'Quality Lab',
  pipelines: 'Smart Pipelines',
  presets: 'Saved Presets',
  settings: 'Settings',
  help: 'Help & Engine',
};

const TRACKABLE_TOOL_IDS = new Set<NavToolId>([
  'video',
  'gif-studio',
  'images',
  'audio',
  'converter',
  'compressor',
  'batch',
  'quality-lab',
  'pipelines',
]);

export default function App() {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useStatorSettings();

  const [activeNav, setActiveNav] = useState<NavToolId>('home');
  const [activeStageItemId, setActiveStageItemId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isExportCenterOpen, setIsExportCenterOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isToolsDirectoryOpen, setIsToolsDirectoryOpen] = useState(false);
  const [legalRoute, setLegalRoute] = useState<LegalRoute>(() =>
    typeof window !== 'undefined'
      ? parseLegalRoute(window.location.pathname, window.location.hash)
      : 'none'
  );

  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const projectJsonInputRef = useRef<HTMLInputElement>(null);

  const {
    queue,
    setQueue,
    history,
    ephemeralMode,
    isPaused,
    globalPreset,
    toastMessage,
    canUndoClear,
    showToast,
    canUndoEdit,
    canRedoEdit,
    undoEditLabel,
    redoEditLabel,
    clearEditHistory,
    handleUndoEdit,
    handleRedoEdit,
    handleToggleEphemeralMode,
    handleDeleteHistoryEntry,
    handleClearAllHistory,
    handleWipeAllData,
    handleFilesSelected,
    handleReconnectItemFile,
    handleLoadSampleFiles,
    handleRemoveItem,
    handleReorderItem,
    handleClearQueue,
    handleUndoClearQueue,
    handleUpdateTargetFormat,
    handleBatchUpdateFormat,
    handleUpdatePresetSettings,
    handleApplyPreset,
    handleSplitItemSegment,
    handleMergeClips,
    handleReplaceVideoAudio,
    handleStartConversion,
    handleCancelConversion,
    handleTogglePause,
    handleConvertAll,
    exportOutputsZip,
    exportOutputsToFolder,
    wasmLoadProgress,
  } = useConversionQueue({
    filenameTemplate: settings.filenameTemplate,
    maxImageWorkers: settings.maxImageWorkers,
    defaultCompressionGoal: settings.defaultCompressionGoal,
    defaultNormalizeAudio: settings.defaultNormalizeAudio,
    defaultStripMetadata: settings.defaultStripMetadata,
  });

  const projectWorkspace = useProjectWorkspace({
    autosaveProjects: settings.autosaveProjects,
    cacheSmallMediaThresholdMb: settings.cacheSmallMediaThresholdMb,
    ephemeralMode,
    filenameTemplate: settings.filenameTemplate,
    queue,
    setQueue,
    onFilesSelected: handleFilesSelected,
    onClearEditHistory: clearEditHistory,
    onToast: showToast,
  });

  // Keep active stage item valid when queue changes
  useEffect(() => {
    if (queue.length === 0) {
      setActiveStageItemId(null);
      return;
    }
    if (!activeStageItemId || !queue.some((q) => q.id === activeStageItemId)) {
      setActiveStageItemId(queue[0].id);
    }
  }, [queue, activeStageItemId]);

  // URL navigation (/privacy, /terms, /dmca, /)
  useEffect(() => {
    const syncPath = () => {
      setLegalRoute(parseLegalRoute(window.location.pathname, window.location.hash));
    };
    syncPath();
    window.addEventListener('popstate', syncPath);
    window.addEventListener('hashchange', syncPath);
    return () => {
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('hashchange', syncPath);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (legalRoute === 'privacy') document.title = 'Stator — Privacy Policy';
    else if (legalRoute === 'terms') document.title = 'Stator — Software Terms & License';
    else if (legalRoute === 'dmca') document.title = 'Stator — Copyright & DMCA Notice';
    else document.title = 'Stator';
  }, [legalRoute]);

  const navigateLegal = (route: LegalRoute) => {
    setLegalRoute(route);
    const targetPath = legalRouteToPath(route);
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitLegalRoute = () => {
    setLegalRoute('none');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  // Global Cmd/Ctrl+K + Ctrl/Cmd+Z / Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'z' &&
        STUDIO_TOOL_IDS.has(activeNav)
      ) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        if (e.shiftKey) handleRedoEdit();
        else handleUndoEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNav, handleUndoEdit, handleRedoEdit]);

  // Global Cmd/Ctrl+V clipboard media paste
  const openFilesSmartRef = useRef(projectWorkspace.openFilesInSmartProject);
  openFilesSmartRef.current = projectWorkspace.openFilesInSmartProject;

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const items = e.clipboardData?.files;
      if (items && items.length > 0) {
        e.preventDefault();
        const files = Array.from(items);
        void openFilesSmartRef.current(files).then((proj) => {
          exitLegalRoute();
          setActiveNav(proj.type === 'image' ? 'images' : proj.type === 'audio' ? 'audio' : proj.type === 'video' ? 'video' : 'converter');
          showToast(`Opened ${files.length} pasted file${files.length === 1 ? '' : 's'} in Studio`);
        });
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showToast]);

  const handleSelectNav = (id: NavToolId) => {
    exitLegalRoute();
    if (id === 'presets') {
      setIsPresetModalOpen(true);
      return;
    }
    setActiveNav(id);

    if (TRACKABLE_TOOL_IDS.has(id)) {
      const nextRecent = [id, ...settings.recentTools.filter((t) => t !== id)].slice(0, 6);
      updateSettings({ recentTools: nextRecent });
    }

    // If user focuses a category tool (video, images, audio), jump active item to a matching file if available
    if (id === 'video') {
      const match = queue.find((q) => q.typeCategory === 'video');
      if (match) setActiveStageItemId(match.id);
    } else if (id === 'images') {
      const match = queue.find((q) => q.typeCategory === 'image');
      if (match) setActiveStageItemId(match.id);
    } else if (id === 'audio') {
      const match = queue.find((q) => q.typeCategory === 'audio');
      if (match) setActiveStageItemId(match.id);
    }
  };

  const handleCreateNewProject = async (type: ProjectType) => {
    exitLegalRoute();
    const nextTypes = [type, ...settings.recentProjectTypes.filter((t) => t !== type)].slice(0, 4);
    updateSettings({ recentProjectTypes: nextTypes });

    if (type === 'gif') {
      setActiveNav('gif-studio');
      await projectWorkspace.createProject('gif');
      return;
    }
    await projectWorkspace.createProject(type);
    const navTarget: NavToolId =
      type === 'video'
        ? 'video'
        : type === 'image'
        ? 'images'
        : type === 'audio'
        ? 'audio'
        : type === 'batch'
        ? 'batch'
        : 'converter';
    setActiveNav(navTarget);
  };

  const handleOpenExistingProject = async (projectId: string) => {
    exitLegalRoute();
    const opened = await projectWorkspace.openProject(projectId);
    if (!opened) return;
    if (opened.type === 'gif') setActiveNav('gif-studio');
    else if (opened.type === 'video') setActiveNav('video');
    else if (opened.type === 'image') setActiveNav('images');
    else if (opened.type === 'audio') setActiveNav('audio');
    else if (opened.type === 'batch') setActiveNav('batch');
    else setActiveNav('converter');
  };

  const handleIncomingMediaFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    exitLegalRoute();
    const proj = await projectWorkspace.openFilesInSmartProject(files);
    const navTarget: NavToolId =
      files.length > 1
        ? 'batch'
        : proj.type === 'video'
        ? 'video'
        : proj.type === 'image'
        ? 'images'
        : proj.type === 'audio'
        ? 'audio'
        : 'converter';
    setActiveNav(navTarget);
  };

  const handleTogglePinTool = (id: NavToolId) => {
    const exists = settings.pinnedTools.includes(id);
    const next = exists
      ? settings.pinnedTools.filter((t) => t !== id)
      : [...settings.pinnedTools, id].slice(0, 8);
    updateSettings({ pinnedTools: next });
  };

  const readyCount = queue.filter((i) => i.status === 'ready' && !i.needsReconnect).length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const isStudioView = legalRoute === 'none' && STUDIO_TOOL_IDS.has(activeNav);
  const motionMode =
    settings.motionPreference === 'reduced'
      ? 'always'
      : settings.motionPreference === 'full'
      ? 'never'
      : 'user';

  return (
    <MotionConfig reducedMotion={motionMode}>
      <div className="min-h-screen bg-[var(--stator-bg)] text-[var(--stator-fg)] flex font-sans selection:bg-[var(--stator-cta-bg)] selection:text-[var(--stator-cta-fg)]">
        <input
          ref={globalFileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleIncomingMediaFiles(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />
        <input
          ref={projectJsonInputRef}
          type="file"
          accept=".json,.stator.json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void projectWorkspace.importProjectFile(f);
            e.target.value = '';
          }}
        />

        {/* Persistent Left Navigation Sidebar */}
        <Sidebar
          activeNav={activeNav}
          onSelectNav={handleSelectNav}
          onOpenToolsDirectory={() => setIsToolsDirectoryOpen(true)}
          collapsed={settings.sidebarCollapsed}
          onToggleCollapse={() =>
            updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })
          }
          width={settings.sidebarWidth}
          onChangeWidth={(sidebarWidth) => updateSettings({ sidebarWidth })}
          pinnedTools={settings.pinnedTools}
          recentTools={settings.recentTools}
          onTogglePinTool={handleTogglePinTool}
          projectCount={projectWorkspace.projects.length}
          historyCount={history.length}
          queuedCount={queue.length}
          ephemeralMode={ephemeralMode}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Shell Column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <TopBar
            viewTitle={
              legalRoute === 'privacy'
                ? 'Privacy Policy'
                : legalRoute === 'terms'
                ? 'Software Terms & License'
                : legalRoute === 'dmca'
                ? 'Copyright & DMCA Notice'
                : VIEW_TITLES[activeNav]
            }
            isStudioView={isStudioView}
            isHomeView={legalRoute === 'none' && activeNav === 'home'}
            projectName={projectWorkspace.activeProject?.name || 'Active Studio'}
            onRenameProject={(name) => {
              if (projectWorkspace.activeProjectId) {
                void projectWorkspace.renameProject(projectWorkspace.activeProjectId, name);
              }
            }}
            onNavigateHome={() => {
              exitLegalRoute();
              setActiveNav('home');
            }}
            saveStatus={projectWorkspace.saveStatus}
            canUndo={canUndoEdit}
            canRedo={canRedoEdit}
            undoLabel={undoEditLabel}
            redoLabel={redoEditLabel}
            onUndo={handleUndoEdit}
            onRedo={handleRedoEdit}
            onSaveSnapshot={
              projectWorkspace.activeProject
                ? () => void projectWorkspace.createProjectSnapshot()
                : undefined
            }
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenExportCenter={() => setIsExportCenterOpen(true)}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            readyCount={readyCount}
            completedCount={completedCount}
            theme={theme}
            isDark={isDark}
            onThemeChange={(m) => {
              setTheme(m);
              updateSettings({ theme: m });
            }}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />

          <OfflineIndicator />

          <main className="flex-1 flex flex-col min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={legalRoute !== 'none' ? legalRoute : isStudioView ? 'studio' : activeNav}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={STATOR_TRANSITION.view}
                className="flex-1 flex flex-col min-w-0"
              >
            {legalRoute === 'privacy' ? (
              <PrivacyPolicy
                onBack={() => navigateLegal('none')}
                onNavigateLegal={(r) => navigateLegal(r)}
              />
            ) : legalRoute === 'terms' ? (
              <TermsOfService
                onBack={() => navigateLegal('none')}
                onNavigateLegal={(r) => navigateLegal(r)}
              />
            ) : legalRoute === 'dmca' ? (
              <CopyrightNotice
                onBack={() => navigateLegal('none')}
                onNavigateLegal={(r) => navigateLegal(r)}
              />
            ) : activeNav === 'home' ? (
              <HomeDashboard
                projects={projectWorkspace.projects}
                ephemeralMode={ephemeralMode}
                recentProjectTypes={settings.recentProjectTypes}
                onCreateProject={(type) => void handleCreateNewProject(type)}
                onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
                onOpenProject={(id) => void handleOpenExistingProject(id)}
                onRenameProject={(id, name) => void projectWorkspace.renameProject(id, name)}
                onDuplicateProject={(id) => void projectWorkspace.duplicateProject(id)}
                onTogglePinProject={(id) => void projectWorkspace.togglePinProject(id)}
                onDeleteProject={(id) => void projectWorkspace.removeProject(id)}
                onExportProjectJson={projectWorkspace.exportProjectFile}
                onImportProjectJson={(file) => void projectWorkspace.importProjectFile(file)}
                onImportMediaFiles={(files) => void handleIncomingMediaFiles(files)}
                onLoadSamples={async () => {
                  await projectWorkspace.createProject('batch', 'Sample Media Session');
                  const loaded = await handleLoadSampleFiles();
                  if (loaded.length > 0) {
                    setActiveNav('batch');
                  }
                }}
                onOpenAllProjects={() => setActiveNav('projects')}
              />
            ) : activeNav === 'projects' ? (
              <ProjectsView
                projects={projectWorkspace.projects}
                onCreateProject={(type) => void handleCreateNewProject(type)}
                onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
                onOpenProject={(id) => void handleOpenExistingProject(id)}
                onRenameProject={(id, name) => void projectWorkspace.renameProject(id, name)}
                onDuplicateProject={(id) => void projectWorkspace.duplicateProject(id)}
                onTogglePinProject={(id) => void projectWorkspace.togglePinProject(id)}
                onDeleteProject={(id) => void projectWorkspace.removeProject(id)}
                onExportProjectJson={projectWorkspace.exportProjectFile}
                onImportProjectJson={(file) => void projectWorkspace.importProjectFile(file)}
              />
            ) : isStudioView ? (
              <StatorStudio
                activeTool={activeNav}
                project={projectWorkspace.activeProject}
                queue={queue}
                activeItemId={activeStageItemId}
                onSelectActiveItem={setActiveStageItemId}
                onFilesDropped={(files) => void handleIncomingMediaFiles(files)}
                onAddFilesClick={() => globalFileInputRef.current?.click()}
                onLoadSamples={() => void handleLoadSampleFiles()}
                onRemoveItem={handleRemoveItem}
                onReorderItem={handleReorderItem}
                onUpdateTargetFormat={handleUpdateTargetFormat}
                onBatchUpdateFormat={handleBatchUpdateFormat}
                onUpdatePresetSettings={handleUpdatePresetSettings}
                onStartConversion={(id) => void handleStartConversion(id)}
                onCancelConversion={handleCancelConversion}
                onConvertAll={() => void handleConvertAll()}
                onTogglePause={handleTogglePause}
                isPaused={isPaused}
                onReconnectFile={handleReconnectItemFile}
                onSplitClip={handleSplitItemSegment}
                onMergeClips={(ids, mode, fmt) => void handleMergeClips(ids, mode, fmt)}
                onReplaceVideoAudio={(id, audio) => void handleReplaceVideoAudio(id, audio)}
                onRestoreSnapshot={(snapId) => void projectWorkspace.restoreProjectSnapshot(snapId)}
                leftWidth={settings.leftPanelWidth}
                rightWidth={settings.rightPanelWidth}
                onResizeLeft={(leftPanelWidth) => updateSettings({ leftPanelWidth })}
                onResizeRight={(rightPanelWidth) => updateSettings({ rightPanelWidth })}
                showCheckerboardDefault={settings.showCheckerboardDefault}
                wasmLoadProgress={wasmLoadProgress}
                onToast={showToast}
              />
            ) : activeNav === 'gif-studio' ? (
              <GifStudioPanel
                onToast={showToast}
                onApplyCreatorRecipe={(recipeSettings, label, targetFormat) => {
                  handleApplyPreset(recipeSettings, null);
                  if (targetFormat) {
                    setQueue((prev) =>
                      prev.map((item) => {
                        if (item.status !== 'ready') return item;
                        const isImageTarget = ['AVIF', 'WEBP', 'PNG', 'JPEG'].includes(targetFormat);
                        const isVideoTarget = ['MP4', 'WEBM', 'MOV', 'GIF'].includes(targetFormat);
                        if (
                          (item.typeCategory === 'image' && isImageTarget) ||
                          (item.typeCategory === 'video' && isVideoTarget)
                        ) {
                          return {
                            ...item,
                            targetFormat,
                            outputName: buildOutputFilename(item.name, targetFormat),
                          };
                        }
                        return item;
                      })
                    );
                  }
                  setActiveNav('converter');
                  showToast(`Applied ${label}`);
                }}
              />
            ) : activeNav === 'quality-lab' ? (
              <QualityLabView
                queue={queue}
                onApplyCandidatePreset={(format, preset) => {
                  const target = queue.find((q) => q.id === activeStageItemId) || queue[0];
                  if (target) {
                    handleUpdateTargetFormat(target.id, format);
                    handleUpdatePresetSettings(target.id, preset, 'Apply Quality Lab winner');
                    setActiveNav('converter');
                    showToast(`Applied ${format} winner preset to ${target.name}`);
                  } else {
                    handleApplyPreset(preset, null);
                    showToast(`Applied ${format} preset as global default`);
                  }
                }}
                onToast={showToast}
              />
            ) : activeNav === 'pipelines' ? (
              <SmartPipelinesView
                queue={queue}
                onApplyPipelineToQueue={(recipe, compiledPreset) => {
                  setQueue((prev) =>
                    prev.map((item) => {
                      if (!isPipelineCompatibleWithCategory(recipe, item.typeCategory)) {
                        return item;
                      }
                      return {
                        ...item,
                        targetFormat: recipe.targetFormat,
                        outputName: buildOutputFilename(item.name, recipe.targetFormat),
                        presetSettings: compiledPreset,
                      };
                    })
                  );
                  setActiveNav('batch');
                  showToast(`Applied pipeline "${recipe.name}" in single-pass mode`);
                }}
                onToast={showToast}
              />
            ) : activeNav === 'history' ? (
              <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8">
                <HistoryWorkspaceView
                  history={history}
                  onClearHistory={() => void handleClearAllHistory()}
                  onDeleteEntry={(id) => void handleDeleteHistoryEntry(id)}
                  ephemeralMode={ephemeralMode}
                  onToggleEphemeralMode={(e) => void handleToggleEphemeralMode(e)}
                  onWipeAllData={async () => {
                    await handleWipeAllData();
                    await projectWorkspace.clearAllProjects();
                  }}
                  onBackToConverter={() => setActiveNav('home')}
                />
              </div>
            ) : activeNav === 'settings' ? (
              <SettingsView
                settings={settings}
                onUpdateSettings={updateSettings}
                onResetSettings={resetSettings}
                theme={theme}
                onThemeChange={setTheme}
                ephemeralMode={ephemeralMode}
                onToggleEphemeralMode={(e) => void handleToggleEphemeralMode(e)}
                onWipeAllData={async () => {
                  await handleWipeAllData();
                  await projectWorkspace.clearAllProjects();
                }}
                onToast={showToast}
                onNavigateLegal={(r) => navigateLegal(r)}
              />
            ) : (
              <GuideWorkspaceView
                onBackToConverter={() => setActiveNav('home')}
                onNavigateLegal={(r) => navigateLegal(r)}
              />
            )}
              </motion.div>
            </AnimatePresence>
          </main>

          <StatusFooter />
        </div>

        <ExportCenterModal
          isOpen={isExportCenterOpen}
          onClose={() => setIsExportCenterOpen(false)}
          queue={queue}
          filenameTemplate={settings.filenameTemplate}
          onUpdateFilenameTemplate={(filenameTemplate) => updateSettings({ filenameTemplate })}
          onConvertAll={() => void handleConvertAll()}
          onRetryItem={(id) => void handleStartConversion(id)}
          onExportZip={() => void exportOutputsZip()}
          onExportFolder={() => void exportOutputsToFolder()}
          onToast={showToast}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          hasQueuedFiles={queue.length > 0}
          readyCount={readyCount}
          activeNav={activeNav}
          onSelectNav={handleSelectNav}
          onNavigateLegal={(r) => navigateLegal(r)}
          onCreateBlankProject={() => void handleCreateNewProject('blank')}
          onChooseFiles={() => globalFileInputRef.current?.click()}
          onLoadSamples={() => void handleLoadSampleFiles()}
          onConvertAll={() => void handleConvertAll()}
          onClearQueue={handleClearQueue}
          onOpenExportCenter={() => setIsExportCenterOpen(true)}
          onOpenPresets={() => setIsPresetModalOpen(true)}
          onToggleTheme={toggleTheme}
          isDark={isDark}
        />

        <PresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          onApply={handleApplyPreset}
          initialSettings={globalPreset}
          activeItemId={null}
        />

        <NewProjectModal
          isOpen={isNewProjectModalOpen}
          onClose={() => setIsNewProjectModalOpen(false)}
          onCreateProject={(type) => void handleCreateNewProject(type)}
          onImportProjectJsonClick={() => projectJsonInputRef.current?.click()}
          onImportMediaClick={() => globalFileInputRef.current?.click()}
        />

        <ToolsDirectoryModal
          isOpen={isToolsDirectoryOpen}
          onClose={() => setIsToolsDirectoryOpen(false)}
          tools={NAV_ITEMS}
          pinnedTools={settings.pinnedTools}
          recentTools={settings.recentTools}
          onSelectTool={handleSelectNav}
          onTogglePinTool={handleTogglePinTool}
        />

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={STATOR_TRANSITION.overlay}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] text-[var(--stator-fg)] shadow-xl text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--stator-success)] shrink-0" />
              <span>{toastMessage}</span>
              {canUndoClear && (
                <button
                  type="button"
                  onClick={handleUndoClearQueue}
                  className="ml-1 px-2 py-0.5 rounded-md bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] text-[var(--stator-fg)] border border-[var(--stator-border)] inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
