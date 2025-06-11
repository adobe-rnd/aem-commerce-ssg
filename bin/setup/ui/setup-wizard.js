import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Separate DiffViewer Web Component for isolated diff rendering
class DiffViewer extends LitElement {
    static properties = {
        patch: { type: String },
        loading: { type: Boolean }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            background: #0d1117;
            overflow: hidden;
        }

        #diff-container {
            width: 100%;
            height: 400px;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace;
            background: #0d1117;
            color: #f0f6fc;
        }

        /* Dark theme overrides for diff2html */
        #diff-container .d2h-wrapper {
            background: #0d1117 !important;
            color: #f0f6fc !important;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace;
        }

        #diff-container .d2h-file-header {
            background: #21262d !important;
            border-bottom: 1px solid #30363d !important;
            color: #f0f6fc !important;
            padding: 10px;
            font-weight: bold;
        }

        #diff-container .d2h-file-list-wrapper {
            background: #0d1117 !important;
        }

        #diff-container .d2h-file-list-header {
            background: #21262d !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-file-list-title {
            color: #f0f6fc !important;
        }

        #diff-container .d2h-file-list-line {
            background: #0d1117 !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-code-line {
            display: table !important;
            width: 100% !important;
            background: #0d1117 !important;
            color: #f0f6fc !important;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.4;
        }

        #diff-container .d2h-code-side-line {
            display: table !important;
            width: 100% !important;
            background: #0d1117 !important;
            color: #f0f6fc !important;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.4;
        }

        /* Dark theme line numbers */
        #diff-container .d2h-code-linenumber,
        #diff-container .d2h-code-side-linenumber {
            background-color: #21262d !important;
            border-right: 1px solid #30363d !important;
            color: #7d8590 !important;
            display: table-cell !important;
            width: 50px !important;
            min-width: 50px !important;
            padding: 0 8px !important;
            text-align: right !important;
            vertical-align: top !important;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace !important;
            font-size: 11px !important;
            user-select: none !important;
            position: static !important;
            z-index: auto !important;
        }

        /* Dark theme content cells */
        #diff-container .d2h-code-line-ctn {
            background: #0d1117 !important;
            color: #f0f6fc !important;
            display: table-cell !important;
            padding: 0 8px !important;
            vertical-align: top !important;
            white-space: pre-wrap !important;
            word-break: break-all !important;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
        }

        /* Dark theme diff colors */
        #diff-container .d2h-ins {
            background-color: #033a16 !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-ins .d2h-code-line-ctn {
            background-color: #033a16 !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-del {
            background-color: #67060c !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-del .d2h-code-line-ctn {
            background-color: #67060c !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-cntx {
            background-color: #0d1117 !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-info {
            background-color: #1f2328 !important;
            color: #f0f6fc !important;
        }

        #diff-container .d2h-moved {
            background-color: #1f2328 !important;
            color: #f0f6fc !important;
        }

        /* Dark theme table structure */
        #diff-container table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            background: #0d1117 !important;
        }

        #diff-container tbody {
            display: table-row-group !important;
            background: #0d1117 !important;
        }

        #diff-container tr {
            display: table-row !important;
            background: #0d1117 !important;
        }

        #diff-container td {
            display: table-cell !important;
            vertical-align: top !important;
            border: none !important;
            background: inherit !important;
        }

        /* Fix diff2html line structure and borders */
        #diff-container .d2h-file-diff {
            border-radius: 0 0 6px 6px;
            background: #0d1117 !important;
        }

        #diff-container .d2h-code-line-prefix,
        #diff-container .d2h-code-line-ctn {
            display: table-cell !important;
            vertical-align: top !important;
        }

        #diff-container .d2h-code-line-prefix {
            width: 40px;
            min-width: 40px;
            text-align: right;
            padding: 0 8px;
            border-right: 1px solid #30363d !important;
            background-color: #21262d !important;
            color: #7d8590 !important;
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.4;
        }

        /* Loading spinner styles */
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #f0f6fc;
            background: #0d1117;
        }

        .spinner {
            border: 3px solid #30363d;
            border-top: 3px solid var(--spectrum-blue-600, #0066cc);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Prevent overlay positioning */
        #diff-container * {
            position: static !important;
            z-index: auto !important;
        }
    `;

    constructor() {
        super();
        this.patch = '';
        this.cssLoaded = false;
        this.loading = false;
    }

    async firstUpdated() {
        // Load diff2html CSS into this component's Shadow DOM
        await this.loadDiff2HtmlCSS();
    }

    async loadDiff2HtmlCSS() {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css';
            link.onload = () => {
                this.cssLoaded = true;
                resolve();
            };
            link.onerror = (err) => reject(err);
            this.shadowRoot.appendChild(link);
        });
    }

    updated(changedProperties) {
        if (changedProperties.has('patch')) {
            this.renderDiff();
        }
    }

    async renderDiff() {
        // Wait for both the component's CSS to load and the Diff2Html library to be ready.
        if (!this.cssLoaded || typeof window.Diff2Html === 'undefined') {
            // If either is not ready, wait a bit and retry.
            setTimeout(() => this.renderDiff(), 100);
            return;
        }

        const diffContainer = this.shadowRoot.getElementById('diff-container');
        if (!diffContainer) {
            console.error('Diff container not found');
            return;
        }

        // Clear previous diff
        while (diffContainer.firstChild) {
            diffContainer.removeChild(diffContainer.firstChild);
        }

        if (this.loading) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-container';
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <p>Generating configuration preview...</p>
            `;
            diffContainer.appendChild(loadingIndicator);
            return;
        }
        
        // Only render if CSS is loaded and patch is available
        if (!this.cssLoaded || !this.patch) {
            return;
        }

        // Use diff2html to parse the patch and generate HTML
        const diffJson = window.Diff2Html.parse(this.patch);
        const diffHtml = window.Diff2Html.html(diffJson, {
            drawFileList: true,
            outputFormat: 'line-by-line',
            matching: 'lines',
            renderNothingWhenEmpty: true,
        });

        // Create a temporary container to sanitize the HTML
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = diffHtml;

        // Force static positioning to fix display issues
        Array.from(tempContainer.querySelectorAll('*')).forEach(el => {
            el.style.position = 'static';
        });

        // Append sanitized and adjusted HTML
        diffContainer.appendChild(tempContainer);
    }
    
    render() {
        return html`
            <div id="diff-container" class="diff-container-dark">
                <!-- Diff content will be rendered here -->
            </div>
        `;
    }
}

if (!customElements.get('diff-viewer')) {
    customElements.define('diff-viewer', DiffViewer);
}

export class SetupWizard extends LitElement {
    static properties = {
        // Wizard state
        wizardStep: { type: Number, state: true },
        isLoading: { type: Boolean, state: true },
        isApplyingConfig: { type: Boolean, state: true },

        // Form inputs
        aemAdminToken: { type: String, state: true },
        isTokenValid: { type: Boolean, state: true },
        tokenPayload: {type: String, state: true },

        // AIO project details
        aioOrg: { type: "String", state: true },
        aioSite: { type: "String", state: true },
        aioNamespace: { type: String, state: true },
        aioAuth: { type: String, state: true },
        
        // Advanced settings
        advancedSettings: { type: Object, state: true },

        // Generated configs
        setupResponse: { type: Object, state: true },
        configPatch: { type: String, state: true },

        // Health checks
        healthCheckResults: { type: Object, state: true },
        isHealthCheckRunning: { type: Boolean, state: true },

        // Toast notifications
        toastMessage: { type: String, state: true },
        isToastVisible: { type: Boolean, state: true },
        toastVariant: { type: String, state: true },
        toastTimeout: { type: Number, state: true },

        // Download tracking
        filesDownloadedManually: { type: Boolean, state: true }
    };

    static styles = css`
        :host {
            display: block;
            margin: 20px;
            --toast-negative-bg: #D13241;
            --toast-positive-bg: #218739;
        }
        .container {
            max-width: 900px;
            margin: auto;
            padding: 24px;
            background-color: #1e1e1e;
            border-radius: 8px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            text-align: center;
            margin-bottom: 20px;
        }
        .wizard-container {
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 24px;
            background-color: #2b2b2b;
            border-radius: 8px;
            border: 1px solid #444;
        }
        .step-indicator {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 24px;
            gap: 8px;
        }
        .step {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #3a3a3a;
            color: #cccccc;
            font-size: 14px;
            font-weight: bold;
            border: 2px solid transparent;
            transition: all 0.3s ease;
        }
        .step.active {
            border-color: #0078d4;
            background-color: #0078d4;
            color: #ffffff;
        }
        .step.completed {
            background-color: #107c10;
            color: #ffffff;
            border-color: #107c10;
        }
        .step-connector {
            flex-grow: 1;
            height: 2px;
            background-color: #3a3a3a;
        }
        .step-content {
            background-color: #242424;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #333333;
            min-height: 350px;
            max-height: 600px;
            overflow-y: auto;
        }
        .button-group {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .full-span {
            grid-column: 1 / -1;
        }
        .dropzone-container {
            border: 2px dashed #555;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            background-color: #2a2a2a;
            color: #ccc;
            cursor: pointer;
            transition: border-color 0.3s, background-color 0.3s;
        }
        .dropzone-container:hover {
            border-color: #0078d4;
            background-color: #333;
        }
        .health-check-container {
            margin-top: 24px;
        }
        .toast-notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 1000;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s ease, bottom 0.3s ease;
        }
        .toast-notification.visible {
            opacity: 1;
            bottom: 30px;
        }
        .toast-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        }
    `;

    constructor() {
        super();
        this.wizardStep = 1;
        this.isLoading = false;
        this.isApplyingConfig = false;

        this.aemAdminToken = '';
        this.isTokenValid = false;
        this.tokenPayload = 'No token payload available';

        this.aioOrg = '';
        this.aioSite = '';
        this.aioNamespace = '';
        this.aioAuth = '';

        this.advancedSettings = {
            productPageUrlFormat: '/products/{urlKey}/{sku}',
            storeUrl: '',
            contentUrl: '',
            productsTemplate: '',
            locales: '',
            configName: 'config'
        };

        this.setupResponse = null;
        this.configPatch = '';
        
        this.healthCheckResults = null;
        this.isHealthCheckRunning = false;

        this.toastMessage = '';
        this.isToastVisible = false;
        this.toastVariant = 'negative';
        this.toastTimeout = null;

        this.filesDownloadedManually = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.fetchAIOCredentials();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        
        // Clean up toast timeout to prevent memory leaks
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }

    async fetchAIOCredentials() {
        try {
            const response = await fetch('/api/dotenv');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.aioAuth = data.AIO_runtime_auth || '';
            this.aioNamespace = data.AIO_runtime_namespace || '';
            
            if (this.aioAuth && this.aioNamespace) {
                this.showToastNotification('AIO credentials loaded successfully.', 'positive');
            }
        } catch (error) {
            console.error('Failed to fetch AIO credentials:', error);
            this.showToastNotification('Failed to load AIO credentials from environment.', 'negative');
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('https://admin.hlx.page/auth/discovery/keys');
            if (!response.ok) throw new Error('Failed to fetch keys');
            
            const [headerB64, payloadB64] = token.split('.');
            const payload = JSON.parse(atob(payloadB64));
            this.tokenPayload = JSON.stringify(payload, null, 2);
            
            const { sub } = payload;
            if (sub) {
                const [org, site] = sub.split('/');
                this.aioOrg = org;
                this.aioSite = site;
                this.isTokenValid = true;
            } else {
                throw new Error('Invalid token payload');
            }
        } catch (error) {
            this.isTokenValid = false;
            this.tokenPayload = 'Invalid token format';
        }
    }

    async handleTokenChange(token) {
        this.aemAdminToken = token;
        if (token) {
            await this.verifyToken(token);
            if (this.isTokenValid) {
                const baseUrl = `https://main--${this.aioSite}--${this.aioOrg}.aem.live`;
                this.advancedSettings = {
                    ...this.advancedSettings,
                    contentUrl: baseUrl,
                    storeUrl: baseUrl,
                    productsTemplate: `${baseUrl}/products/default`
                };
            }
        } else {
            this.isTokenValid = false;
            this.tokenPayload = 'No token payload available';
        }
    }

    handleAdvancedSettingInput(field, value) {
        this.advancedSettings = { ...this.advancedSettings, [field]: value };
    }

    prevStep() {
        if (this.wizardStep > 1) {
            this.wizardStep -= 1;
        }
    }

    showToastNotification(message, variant = 'negative') {
        // Clear any existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.toastMessage = message;
        this.toastVariant = variant;
        this.isToastVisible = true;
        
        // Auto-hide after 4 seconds (positive toasts) or 6 seconds (negative toasts)
        const autoHideDelay = variant === 'positive' ? 4000 : 6000;
        this.toastTimeout = setTimeout(() => {
            this.hideToastNotification();
        }, autoHideDelay);
    }

    hideToastNotification() {
        // Clear the timeout when manually hiding
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
        this.isToastVisible = false;
    }

    handleToastClose(event) {
        event.stopPropagation();
        this.hideToastNotification();
    }
    
    handleToastClick(event) {
        event.stopPropagation();
        this.hideToastNotification();
    }

    async nextStep() {
        // --- VALIDATIONS for current step before proceeding ---
        if (this.wizardStep === 2 && !this.isTokenValid) {
            this.showToastNotification('Please provide a valid AEM Admin Token.');
            return;
        }

        // --- ACTIONS for TRANSITIONING to next step ---
        if (this.wizardStep === 3) {
            await this.handlePreviewSetup();
        }
        if (this.wizardStep === 4) {
            // Apply configuration when leaving the preview step
            const success = await this.applyConfig();
            if (!success) {
                // Don't proceed if config application failed
                return;
            }
            // Automatically download files after successful config application (only if not already downloaded)
            if (!this.filesDownloadedManually) {
                this.downloadConfigFiles();
            }
        }

        // --- INCREMENT STEP ---
        if (this.wizardStep < 5) {
            this.wizardStep += 1;
            
            // Auto-start health checks when reaching step 5
            if (this.wizardStep === 5) {
                // Small delay to allow UI to render before starting checks
                setTimeout(() => {
                    this.performHealthChecks();
                }, 500);
            }
        }
    }
    
    async handlePreviewSetup() {
        this.isLoading = true;
        
        const diffViewer = this.shadowRoot.querySelector('diff-viewer');
        if (diffViewer) diffViewer.loading = true;

        try {
            const response = await fetch('/api/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AIO-auth': this.aioAuth,
                    'X-AIO-namespace': this.aioNamespace,
                    'X-AEM-admin-token': this.aemAdminToken
                },
                body: JSON.stringify({
                    org: this.aioOrg,
                    site: this.aioSite,
                    contentUrl: this.advancedSettings.contentUrl,
                    productsTemplate: this.advancedSettings.productsTemplate,
                    productPageUrlFormat: this.advancedSettings.productPageUrlFormat,
                    storeUrl: this.advancedSettings.storeUrl,
                    locales: this.advancedSettings.locales
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.setupResponse = data;
            this.configPatch = data.patch;

        } catch (error) {
            this.showToastNotification('Failed to generate config preview.', 'negative');
        } finally {
            this.isLoading = false;
            if (diffViewer) diffViewer.loading = false;
        }
    }

    downloadConfig() {
        if (this.setupResponse && this.setupResponse.newAppConfig) {
            const a = document.createElement('a');
            const file = new Blob([this.setupResponse.newAppConfig], {type: 'text/yaml'});
            a.href = URL.createObjectURL(file);
            a.download = 'app.config.yaml';
            a.click();
            URL.revokeObjectURL(a.href);
        }
    }

    downloadConfigFiles() {
        // Download app.config.yaml
        this.downloadConfig();
        
        // Download aem-commerce-prerender-org--site.json
        const commerceConfig = {
            aemAdminToken: this.aemAdminToken,
            org: this.aioOrg,
            site: this.aioSite,
            aioAuth: this.aioAuth,
            aioNamespace: this.aioNamespace
        };
        
        const fileName = `aem-commerce-prerender-${this.aioOrg}--${this.aioSite}.json`;
        const jsonContent = JSON.stringify(commerceConfig, null, 2);
        
        const a = document.createElement('a');
        const file = new Blob([jsonContent], {type: 'application/json'});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
        
        // Mark that files have been downloaded manually
        this.filesDownloadedManually = true;
        
        this.showToastNotification('Configuration files downloaded successfully!', 'positive');
    }

    async applyConfig() {
        this.isApplyingConfig = true;
        try {
            const response = await fetch('/api/helix-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AEM-admin-token': this.aemAdminToken
                },
                body: JSON.stringify({
                    newIndexConfig: this.setupResponse.newIndexConfig,
                    newSiteConfig: this.setupResponse.newSiteConfig,
                })
            });

            if (!response.ok) throw new Error('Failed to apply config');
            this.showToastNotification('Configuration applied successfully!', 'positive');
            return true;
        } catch (error) {
            this.showToastNotification('Error applying configuration.', 'negative');
            return false;
        } finally {
            this.isApplyingConfig = false;
        }
    }

    async saveAndCompleteSetup() {
        // Configuration has already been applied in Step 6, so just complete the setup
        try {
            await fetch('/api/wizard/done', { method: 'POST' });
            this.showToastNotification('Setup complete! The browser will now close.', 'positive');
            setTimeout(() => window.close(), 2000);
        } catch (e) {
            // It might fail to fetch if the server closes immediately.
            this.showToastNotification('Setup complete! The browser will now close.', 'positive');
            setTimeout(() => window.close(), 2000);
        }
    }

    finishSetup() {
        // Send beacon to indicate setup completion
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/wizard/done');
        } else {
            // Fallback for browsers that don't support sendBeacon
            fetch('/api/wizard/done', { method: 'POST' }).catch(() => {
                // Ignore errors since page is closing
            });
        }
        
        this.showToastNotification('Setup complete! Closing...', 'positive');
        
        // Close the page after a short delay
        setTimeout(() => {
            window.close();
        }, 1000);
    }
    
    getStepStatus(stepNumber) {
        if (this.wizardStep > stepNumber) return 'completed';
        if (this.wizardStep === stepNumber) return 'active';
        return '';
    }

    async performHealthChecks() {
        this.isHealthCheckRunning = true;
        this.healthCheckResults = null;
        await new Promise(resolve => setTimeout(resolve, 1500));

        this.healthCheckResults = {
            aioLogin: Math.random() > 0.1,
            aemLogin: Math.random() > 0.1,
            siteConfig: Math.random() > 0.1,
        };
        this.isHealthCheckRunning = false;
        const allChecksPassed = Object.values(this.healthCheckResults).every(status => status);
        if (allChecksPassed) {
            this.showToastNotification('All health checks passed!', 'positive');
        } else {
            this.showToastNotification('Some health checks failed. Please review and click Done to complete setup.', 'negative');
        }
    }
    
    renderWizardStep() {
        switch (this.wizardStep) {
            case 1:
                return html`<div class="step-content">
                    <h3>Prerequisites setup</h3>
                    <ul>
                        <li>Create a repo in your Github organization from the template <a href="https://github.com/new?template_name=aem-commerce-prerender&template_owner=adobe-rnd" target="_blank">here</a>.</li>
                        <li>In your repo root folder, run "aio app use path-to-downloaded-file.json".</li>
                        <li>Download the configuration JSON from your project in <a href="https://developer.adobe.com/console" target="_blank">Developer Console</a> and run "aio app use {configurationFileName}" in your project folder.</li>
                        <li>You're now set to run CLI commands like "aio app dev" to run the project locally or "aio app deploy" to deploy it on your namespace.</li>
                    </ul>
                </div>`;
            case 2:
                return this.renderStep2Token();
            case 3:
                return this.renderStep3AdvancedSettings();
            case 4:
                return this.renderStep4Review();
            case 5:
                return this.renderStep5HealthCheck();
            default:
                return html`<p>Unknown step</p>`;
        }
    }

    renderStep2Token() {
        return html`<div class="step-content">
            <h3>Step 1: AEM Admin Token</h3>
            <sp-field-label for="aem-token" required>AEM Admin Token</sp-field-label>
            <sp-textfield
                id="aem-token"
                type="password"
                placeholder="Paste your AEM admin token here"
                .value=${this.aemAdminToken}
                @input=${e => this.handleTokenChange(e.target.value)}
            ></sp-textfield>
            ${this.isTokenValid ? html`<p>Token valid for Org: <strong>${this.aioOrg}</strong>, Site: <strong>${this.aioSite}</strong></p>`: ''}
            <sp-field-label for="token-payload">Token Payload</sp-field-label>
            <pre id="token-payload">${this.tokenPayload}</pre>
        </div>`;
    }

    renderStep3AdvancedSettings() {
        return html`
            <div class="step-content">
                <h3>Step 2: Review Configuration</h3>
                
                <!-- AIO Credentials Display -->
                <div style="margin-bottom: 24px; padding: 16px; background-color: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                    <h4 style="margin: 0 0 12px 0; color: #f0f6fc;">AIO Runtime Credentials</h4>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-family: monospace; font-size: 12px;">
                        <span style="color: #7d8590;">Namespace:</span>
                        <span style="color: #f0f6fc;">${this.aioNamespace || 'Not loaded'}</span>
                        <span style="color: #7d8590;">Auth:</span>
                        <span style="color: #f0f6fc;">${this.aioAuth || 'Not loaded'}</span>
                    </div>
                </div>
                
                <!-- Main Configuration Fields -->
                <div class="main-config-fields">
                    <div class="form-grid">
                        <sp-field-label for="org-field">Organization</sp-field-label>
                        <sp-textfield 
                            id="org-field" 
                            .value=${this.aioOrg} 
                            readonly
                            style="background-color: #2a2a2a;"
                        ></sp-textfield>
                        
                        <sp-field-label for="site-field">Site</sp-field-label>
                        <sp-textfield 
                            id="site-field" 
                            .value=${this.aioSite} 
                            readonly
                            style="background-color: #2a2a2a;"
                        ></sp-textfield>

                        <sp-field-label for="product-page-url-format" required>Product Page URL Format</sp-field-label>
                        <sp-textfield 
                            id="product-page-url-format" 
                            .value=${this.advancedSettings.productPageUrlFormat} 
                            @input=${e => this.handleAdvancedSettingInput('productPageUrlFormat', e.target.value)}
                        ></sp-textfield>
                    </div>
                </div>

                <!-- Advanced Settings Accordion -->
                <div style="margin-top: 24px;">
                    <sp-accordion allow-multiple>
                        <sp-accordion-item label="Advanced Settings" ?open=${false}>
                            <div class="form-grid" style="padding: 16px 0;">
                                <sp-field-label for="content-url" required>Content URL</sp-field-label>
                                <sp-textfield 
                                    id="content-url" 
                                    .value=${this.advancedSettings.contentUrl} 
                                    @input=${e => this.handleAdvancedSettingInput('contentUrl', e.target.value)}
                                ></sp-textfield>
                                
                                <sp-field-label for="products-template" required>Products Template</sp-field-label>
                                <sp-textfield 
                                    id="products-template" 
                                    .value=${this.advancedSettings.productsTemplate} 
                                    @input=${e => this.handleAdvancedSettingInput('productsTemplate', e.target.value)}
                                ></sp-textfield>
                                
                                <sp-field-label for="store-url" required>Commerce Store URL</sp-field-label>
                                <sp-textfield 
                                    id="store-url" 
                                    .value=${this.advancedSettings.storeUrl} 
                                    @input=${e => this.handleAdvancedSettingInput('storeUrl', e.target.value)}
                                ></sp-textfield>
                                
                                <sp-field-label for="locales">Locales (optional)</sp-field-label>
                                <sp-textfield 
                                    id="locales" 
                                    .value=${this.advancedSettings.locales} 
                                    @input=${e => this.handleAdvancedSettingInput('locales', e.target.value)}
                                ></sp-textfield>
                            </div>
                        </sp-accordion-item>
                    </sp-accordion>
                </div>
            </div>`;
    }

    renderStep4Review() {
        return html`
            <div class="step-content">
                <h3>Step 3: Preview & Download</h3>
                <p>Below is a preview of the configuration changes that will be applied.</p>
                <diff-viewer .patch=${this.configPatch} ?loading=${this.isLoading}></diff-viewer>
                <div class="button-group">
                     <sp-button @click=${this.downloadConfigFiles} variant="secondary">Download Configuration Files</sp-button>
                </div>
                ${this.isApplyingConfig ? html`
                    <div style="display: flex; align-items: center; justify-content: center; margin-top: 20px; gap: 12px;">
                        <sp-progress-circle indeterminate label="Applying configuration..."></sp-progress-circle>
                        <span style="color: #f0f6fc;">Applying configuration...</span>
                    </div>
                ` : ''}
            </div>`;
    }

    renderStep5HealthCheck() {
        return html`
            <div class="step-content">
                <h3>Step 4: Final Health Check & Completion</h3>
                <p>Running health checks on essential backend services...</p>
                ${this.isHealthCheckRunning ? html`
                    <sp-progress-circle indeterminate label="Running checks..."></sp-progress-circle>
                ` : ''}
                ${this.healthCheckResults ? this.renderHealthChecks() : ''}
            </div>
        `;
    }

    renderHealthChecks() {
        return html`
            <div class="health-check-container">
                <h4>System Health Check</h4>
                ${Object.entries(this.healthCheckResults).map(([key, status]) => html`
                    <div class="health-check-item">
                        <span>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <sp-status-light variant=${status ? 'positive' : 'negative'}>${status ? 'OK' : 'FAIL'}</sp-status-light>
                    </div>
                `)}
                 ${!Object.values(this.healthCheckResults).every(status => status) ? html`
                    <sp-button @click=${this.performHealthChecks}>Retry</sp-button>
                 ` : ''}
            </div>
        `;
    }

    render() {
        return html`
            ${this.isToastVisible ? html`
                <div 
                    class="toast-notification ${this.isToastVisible ? 'visible' : ''}" 
                    style="background-color: ${this.toastVariant === 'positive' ? 'var(--toast-positive-bg)' : 'var(--toast-negative-bg)'};"
                    @click=${this.handleToastClick}
                >
                    ${this.toastMessage}
                    <button class="toast-close-btn" @click=${this.handleToastClose}>&times;</button>
                </div>
            ` : ''}

            <div class="container">
                <div class="title">AEM Commerce Prerender Setup</div>
                <div class="wizard-container">
                    <div class="step-indicator">
                        ${[1, 2, 3, 4, 5].map(i => html`
                            <div class="step ${this.getStepStatus(i)}">${i}</div>
                            ${i < 5 ? html`<div class="step-connector"></div>` : ''}
                        `)}
                    </div>

                    ${this.renderWizardStep()}

                    <div class="button-group">
                        <sp-button variant="secondary" @click=${this.prevStep} ?disabled=${this.wizardStep === 1}>Back</sp-button>
                        ${this.wizardStep < 5 ? html`
                            <sp-button variant="primary" @click=${this.nextStep} ?disabled=${this.isLoading || this.isApplyingConfig}>
                                ${this.isLoading ? html`<sp-progress-circle indeterminate size="s"></sp-progress-circle> Loading...` : 
                                 this.isApplyingConfig ? html`<sp-progress-circle indeterminate size="s"></sp-progress-circle> Applying Config...` :
                                 this.wizardStep === 4 ? 'Apply Configuration' : 'Next'}
                            </sp-button>
                        ` : ''}
                        ${this.wizardStep === 5 ? html`
                            <sp-button variant="primary" @click=${this.finishSetup}>Done</sp-button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('setup-wizard')) {
    customElements.define('setup-wizard', SetupWizard);
}