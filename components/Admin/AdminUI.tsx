import { useSession } from "next-auth/react";
import { FC, useContext, useEffect, useRef, useState } from "react";
import { Modal } from "../ReusableComponents/Modal";
import HomeContext from "@/pages/api/home/home.context";
import InputsMap from "../ReusableComponents/InputMap";
import {  getAdminConfigs, testEmbeddingEndpoint, testEndpoint, updateAdminConfigs } from "@/services/adminService";
import { AdminConfigTypes, Endpoint, FeatureFlagConfig, OpenAIModelsConfig, SupportedModel, SupportedModelsConfig, AdminTab } from "@/types/admin";
import { IconCheck, IconPlus, IconRefresh, IconX} from "@tabler/icons-react";
import { EmailsAutoComplete } from "../Emails/EmailsAutoComplete";
import { LoadingIcon } from "../Loader/LoadingIcon";
import toast from "react-hot-toast";
import React from "react";
import { ActiveTabs } from "../ReusableComponents/ActiveTabs";
import { OpDef } from "@/types/op";
import { AMPLIFY_ASSISTANTS_GROUP_NAME } from "@/utils/app/amplifyAssistants";
import { noRateLimit, PeriodType, rateLimitObj } from "@/types/rateLimit";
import { adminTabHasChanges} from "@/utils/app/admin";
import { Model } from "@/types/model";
import { OpenAIEndpointsTab } from "./AdminComponents/OpenAIEndpoints";
import { FeatureFlagsTab } from "./AdminComponents/FeatureFlags";
import { emptySupportedModel, SupportedModelsTab } from "./AdminComponents/SupportedModels";
import { ConfigurationsTab } from "./AdminComponents/Configurations";
// import { integrationProvidersList, IntegrationSecretsMap, IntegrationsMap } from "@/types/integrations";
// import { checkActiveIntegrations } from "@/services/oauthIntegrationsService";
// import { IntegrationsTab } from "./AdminComponents/Integrations";
import { EmbeddingsTab } from "./AdminComponents/Embeddings";
import { OpsTab } from "./AdminComponents/Ops";
import { Pptx_TEMPLATES, Ast_Group_Data, FeatureDataTab, } from "./AdminComponents/FeatureData";


export const titleLabel = (title: string, textSize: string = "lg") => 
                <div className={`mt-4 text-${textSize} font-bold text-black dark:text-neutral-200`}>
                    {title}
                </div>;

export const loadingIcon = (size: number = 16) => <LoadingIcon style={{ width: `${size}px`, height: `${size}px` }}/>


export const loading = <div className="flex flex-row gap-2 ml-10 text-[1.2rem]"> 
                        <>{loadingIcon(22)}</> Loading...
                      </div>;

export function camelToTitleCase(str: string) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase letters
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Keep consecutive uppercase letters together
        .replace(/\$/g, ' $') // Add a space before any dollar sign
        .replace(/^./, char => char.toUpperCase()); // Capitalize the first letter
}
interface Props {
    open: boolean;
    onClose: () => void;
}


export const AdminUI: FC<Props> = ({ open, onClose }) => {
    const { state: { statsService, amplifyUsers}, dispatch: homeDispatch, setLoadingMessage } = useContext(HomeContext);
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    const [loadData, setLoadData] = useState<boolean>(true);   
    const [stillLoadingData, setStillLoadingData] = useState<boolean>(true);  


    const [unsavedConfigs, setUnsavedConfigs] = useState<Set<AdminConfigTypes>>(new Set());

    const [admins, setAdmins] = useState<string[]>([]);  
    const [allEmails, setAllEmails] = useState<Array<string> | null>(null);

    const [rateLimit, setRateLimit] = useState<{period: PeriodType, rate: string}>({...noRateLimit, rate: '0'});
    const [promptCostAlert, setPromptCostAlert] = useState<PromptCostAlert>({isActive:false, alertMessage: '', cost: 0});

    const [availableModels, setAvailableModels] = useState<SupportedModelsConfig>({});   

    const [features, setFeatures] = useState<FeatureFlagConfig>({}); 

    const [appVars, setAppVars] = useState<{ [key: string]: string }>({});    
    const [appSecrets, setAppSecrets] = useState<{ [key: string]: string }>({});  
    const [refreshingTypes, setRefreshingTypes] = useState< AdminConfigTypes[]>([]);


    const [openAiEndpoints, setOpenAiEndpoints] = useState<OpenAIModelsConfig>({models: []}); 
    const testEndpointsRef = useRef<{ url: string; key: string, model:string}[]>([]);

    const [ops, setOps] = useState<OpDef[]>([]);

    const [astGroups, setAstGroups] = useState<Ast_Group_Data[]>([]);
    const [changedAstGroups, setChangedAstGroups] = useState<string[]>([]);    
    const [amplifyAstGroupId, setAmplifyAstGroupId] = useState<string>('');

    const [templates, setTemplates] = useState<Pptx_TEMPLATES[]>([]);
    const [changedTemplates, setChangedTemplates] = useState<string[]>([]);

    const [ampGroups, setAmpGroups] = useState<Amplify_Groups>({});

    // const [integrations, setIntegrations] = useState<IntegrationsMap | null >(null);
    // const [integrationSecrets, setIntegrationSecrets] = useState<IntegrationSecretsMap>({});

    
    // const getActiveIntegrations = async (supportedIntegrations: IntegrationsMap | null) => {
    //     const checkResponsive = supportedIntegrations ? integrationProvidersList.filter((i:string) => !Object.keys(supportedIntegrations).includes(i))
    //                                                   : integrationProvidersList;
    //     const integrationsResult = await checkActiveIntegrations(checkResponsive);
        
    //     const integrationMap = integrationsResult.integrationLists;
    //     console.log("MAp:\n\n", integrationMap)
    //     if (Object.keys(integrationMap).length > 0) {
    //         setIntegrations(integrationMap);
    //         setIntegrationSecrets(integrationsResult.secrets)
    //     }
    // }
  
    useEffect(() => {
       
        const getConfigs = async () => {
            setLoadData(false);
                //   statsService.openSettingsEvent(); 
            setLoadingMessage("Loading Admin Interface...");
            setStillLoadingData(true);
            const nonlazyReq = getAdminConfigs(); // start longer call
           
            const lazyResult = await getAdminConfigs(true);
            if (lazyResult.success) {
                const data = lazyResult.data;
                setAdmins(data[AdminConfigTypes.ADMINS] || []);
                const featureData = data[AdminConfigTypes.FEATURE_FLAGS];
                setFeatures(featureData || {});
                // handle calls to integrations 
                // if (Object.keys(featureData).includes('integrations')) getActiveIntegrations(data[AdminConfigTypes.INTEGRATIONS]); // async no need to wait

                setAmpGroups(data[AdminConfigTypes.AMPLIFY_GROUPS] || {})
                setTemplates(data[AdminConfigTypes.PPTX_TEMPLATES] || []);
                setRateLimit(data[AdminConfigTypes.RATE_LIMIT || rateLimit]);
                setPromptCostAlert(data[AdminConfigTypes.PROMPT_COST_ALERT || promptCostAlert]);

                setLoadingMessage("");
            
                const nonlazyResult = await nonlazyReq;
                if (nonlazyResult.success) {
                    const data = nonlazyResult.data;
                
                    setAppVars(data[AdminConfigTypes.APP_VARS] || {});
                    setAppSecrets(data[AdminConfigTypes.APP_SECRETS] || {});
                    const ops:OpDef[] = data[AdminConfigTypes.OPS] || [];
                    setOps(ops.sort((a: OpDef, b: OpDef) => a.name.localeCompare(b.name)))
                    setOpenAiEndpoints(data[AdminConfigTypes.OPENAI_ENDPONTS] || { models: [] });
                    const availableModels = data[AdminConfigTypes.AVAILABLE_MODELS] || {};
                    const baseModel = emptySupportedModel();
                    const updatedModels = Object.entries(availableModels).map(([key, model]) => {
                        // Create a new object where null values are replaced with baseModel's values
                        const updatedModel = Object.fromEntries(
                            Object.entries(model as SupportedModel).map(([prop, value]) => [
                                prop,
                                value === null ? baseModel[prop as keyof SupportedModel] : value,
                            ])
                        );
                        return [key, updatedModel];
                    });
                    setAvailableModels(Object.fromEntries(updatedModels));
                    const astAdminGroups: Ast_Group_Data[] = data[AdminConfigTypes.AST_ADMIN_GROUPS] || [];
                    const amplifyAstGroupFound = astAdminGroups.find((g: Ast_Group_Data) => 
                                                                    g.groupName === AMPLIFY_ASSISTANTS_GROUP_NAME);
                    if (amplifyAstGroupFound) setAmplifyAstGroupId(amplifyAstGroupFound.group_id);
                    setAstGroups(astAdminGroups);
                    setStillLoadingData(false);
                    return;
                } 
            } 
            alert("Unable to fetch admin configurations at this time. Please try again.");
            setLoadingMessage("");
            onClose();
            
        }
        if (open && loadData) getConfigs();

        const fetchEmails = async () => {
            setAllEmails(amplifyUsers);
        };
        if (!allEmails) fetchEmails();
      
      }, [open, loadData])
  

    const getConfigTypeData = (type: AdminConfigTypes) => {
        switch (type) {
            case AdminConfigTypes.ADMINS:
                return admins;
            case AdminConfigTypes.RATE_LIMIT:
                return rateLimitObj(rateLimit.period, rateLimit.rate);
            case AdminConfigTypes.PROMPT_COST_ALERT:
                return promptCostAlert;
            case AdminConfigTypes.APP_SECRETS:
                return appSecrets;
            case AdminConfigTypes.APP_VARS:
                return appVars;
            case AdminConfigTypes.FEATURE_FLAGS:
                return features;
            case AdminConfigTypes.AVAILABLE_MODELS:
                return availableModels;
            case AdminConfigTypes.AST_ADMIN_GROUPS:
                return astGroups.filter((g:Ast_Group_Data) => changedAstGroups.includes(g.group_id))
                                .map((g:Ast_Group_Data) =>  ({ group_id: g.group_id, 
                                                              isPublic : g.isPublic,
                                                              amplifyGroups : g.amplifyGroups,
                                                              supportConvAnalysis: g.supportConvAnalysis
                                                            }));
            case AdminConfigTypes.AMPLIFY_GROUPS:
                return ampGroups;
            case AdminConfigTypes.PPTX_TEMPLATES:
                return templates.filter((pptx:Pptx_TEMPLATES) => changedTemplates.includes(pptx.name));
            // case AdminConfigTypes.INTEGRATIONS:
            //     return integrations;
            case AdminConfigTypes.OPENAI_ENDPONTS:
                const toTest:{key: string, url: string, model:string}[] = [];
                const cleanedOpenAiEndpoints: OpenAIModelsConfig = {
                    models: openAiEndpoints.models.map(model => {
                        const newModel: Record<string, { endpoints: Endpoint[] }>= {};
                        Object.keys(model).forEach(modelName => {
                            const endpoints = model[modelName].endpoints
                            .filter(endpoint => endpoint.url !== '' && endpoint.key !== '')
                            .map(endpoint => {
                                // Destructure to exclude 'isNew' from the endpoint
                                const { isNew, ...rest } = endpoint;
                                if (isNew) toTest.push({...rest, model: modelName});
                                return rest; 
                            });
                            newModel[modelName] = { endpoints };
                        });
                        return newModel;
                    })
                };
                if (toTest.length > 0) testEndpointsRef.current = toTest;
                return cleanedOpenAiEndpoints;
        }   
    }

    const processUrl = (url: string) => {
        return url.endsWith('/') ? url : `${url}/`;
    }


    const callTestEndpoints = async () => {
        for (const endpoint of testEndpointsRef.current) {
          const label = `Url: ${endpoint.url}\nKey: ${endpoint.key}`;
          setLoadingMessage(`Testing Endpoint:\n${label}`);
          let result:any = null;
          const model = endpoint.model;
          if (model.includes('embed')) {
            const url = processUrl(endpoint.url);
            const completion = `openai/deployments/${endpoint.model}/embeddings?api-version=2024-02-01`;
            result =  await testEmbeddingEndpoint(`${url}${completion}`, endpoint.key);

          } else if (model === "code-interpreter") {
            const url = processUrl(endpoint.url);
            const completion = "openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview";
            result =  await testEndpoint(`${url}${completion}`, endpoint.key, "gpt-4o");

          } else {
            result =  await testEndpoint(endpoint.url, endpoint.key, model);
          }
         
          if (!result) {
            alert(`Failed to make contact with the new endpoint:\n${label}\n\nPlease check the endpoint data and try saving changes again.`);
            setLoadingMessage(``);
            return false;
          }
        }
        return true;
      };

    const saveUpdateAvailableModels = () => {
        const updatedModels = Object.values(availableModels)
        const defaultId = updatedModels.find((m:SupportedModel) => m.isDefault);
        homeDispatch({ field: 'defaultModelId', value: defaultId });
        const cheapestId = updatedModels.find((m:SupportedModel) => m.defaultCheapestModel);
        homeDispatch({ field: 'cheapestModelId', value: cheapestId });
        const advancedId = updatedModels.find((m:SupportedModel) => m.defaultAdvancedModel);
        homeDispatch({ field: 'advancedModelId', value: advancedId });

        const availModels: Model[] = updatedModels.filter((m:SupportedModel) => m.isAvailable)
                                     .map((m:SupportedModel) => ({ id: m.id,
                                                            "name": m.name,
                                                            "description": m.description ?? '',
                                                            "inputContextWindow": m.inputContextWindow,
                                                            "supportsImages": m.supportsImages,
                                                            } as Model));
        homeDispatch({ field: 'availableModels', value: availModels}); 
    }
      
      

    const handleSave = async () => {
        if (Array.from(unsavedConfigs).length === 0) {
            toast("No Changes to Save");
            return;
        }
        const collectUpdateData =  Array.from(unsavedConfigs).map((type: AdminConfigTypes) => ({type: type, data: getConfigTypeData(type)}));
        // console.log("Saving... ", collectUpdateData);
        // console.log(" testing: ", testEndpointsRef.current);
        if (testEndpointsRef.current.length > 0) {
            setLoadingMessage('Testing New Endpoints...');
            const success = await callTestEndpoints();
            if (!success) {
                setLoadingMessage('');
                if (!confirm("Do you want to continue applying your changes anyway?")) return;
            }
        }
        
        setLoadingMessage('Saving Configurations');
        const result = await updateAdminConfigs(collectUpdateData);
        if (result.success) {
            if (unsavedConfigs.has(AdminConfigTypes.FEATURE_FLAGS)) {
                // to do doesnt account for exclusives think about pulling them again from home same with groups
                homeDispatch({ field: 'featureFlags',
                               value: { ...features, 'adminInterface': admins.includes(userEmail ?? '')} });
                localStorage.setItem('mixPanelOn', JSON.stringify(features.mixPanel ?? false));
            }
            if (unsavedConfigs.has(AdminConfigTypes.AVAILABLE_MODELS)) saveUpdateAvailableModels();
            toast("Configurations successfully saved");
            setUnsavedConfigs(new Set());
            testEndpointsRef.current = [];
        } else {
            if (result.data && Object.keys(result.data).length !== unsavedConfigs.size) {
                const unsucessful: AdminConfigTypes[] = [];
                Array.from(unsavedConfigs).forEach(key => {
                    if ((!(key in result.data)) || (!result.data[key].success)) unsucessful.push(key);
                });
                // should always be true
                if (unsucessful.length > 0) alert(`The following configurations were unable to be saved: \n${unsucessful}`);
            } else {
                alert("We are unable to save the configurations at this time. Please try again later...");
            }
        }

        setLoadingMessage('');
    }

    const updateUnsavedConfigs = (configType: AdminConfigTypes) => {
        setUnsavedConfigs(prevChanges => new Set(prevChanges).add(configType));
    }



    const refresh = (type: AdminConfigTypes, click: () => void, loading: boolean, title:string = 'Refresh Variables', top: string = 'mt-1') => 
        <button
            title={title}
            disabled={refreshingTypes.includes(type)} 
            className={`${top} flex-shrink-0 items-center gap-3 rounded-md border border-neutral-300 dark:border-white/20 px-2 dark:text-white transition-colors duration-200 ${refreshingTypes.includes(type) ? "" : "cursor-pointer hover:bg-neutral-200 dark:hover:bg-gray-500/10"}`}
            onClick={() => {
                setRefreshingTypes([...refreshingTypes, type]);
                click();
            }}
        >
            {refreshingTypes.includes(type) ? <>{loadingIcon()}</> : <IconRefresh size={16}/>}
        </button>

    const isAvailableCheck = (isAvailable: boolean, handleClick: () => void, styling: string = '') => 
        <button title={isAvailable ? "Click to set as unavailable"        
                                   : "Click to set as available" } 
            className={`cursor-pointer dark:text-neutral-200 text-neutral-900 ${styling}`} 
            onClick={handleClick}>
            {isAvailable ? <IconCheck className='text-green-600 hover:opacity-60' size={18} /> 
                         : <IconX  className='text-red-600 hover:opacity-60' size={18} />}       
        </button>
                                                                                                            // parsing should happen in the change
    

    
    const admin_text = 'rounded-r border border-neutral-500 px-4 py-1 dark:bg-[#40414F] bg-gray-200 dark:text-neutral-100 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50'

    const tabTitle = (tab: AdminTab) => {
        return  `${tab}${adminTabHasChanges(Array.from(unsavedConfigs), tab) ? " * " : ""}`;
    }
        
    if (!open) return <></>;

    return <Modal 
    width={() => window.innerWidth - 100}
    height={() => window.innerHeight * 0.95}
    title={`Admin Interface${unsavedConfigs.size > 0 ? " * " : ""}`}
    onCancel={() => {
        if (unsavedConfigs.size === 0 || confirm("You have unsaved changes!\n\nYou will lose any unsaved data, would you still like to close the Admin Interface?"))  onClose();
       
    }} 
    onSubmit={() => handleSave()
    }
    submitLabel={"Save Changes"}
    disableSubmit={unsavedConfigs.size === 0}
    content={
      <div className="text-black dark:text-white overflow-x-hidden">
         <button
            title={`Reload Admin Interface. ${unsavedConfigs.size > 0 ? "Any unsaved changes will be lost.": ""}`}
            className={` fixed top-4 left-[205px] flex-shrink-0 items-center gap-3 rounded-md border border-neutral-300 dark:border-white/20 p-2 dark:text-white transition-colors duration-200 cursor-pointer hover:bg-neutral-200  dark:hover:bg-gray-500/10`}
            onClick={() => {
                setLoadData(true);
                setUnsavedConfigs(new Set());
            }}
        >
            <IconRefresh size={16}/>
        </button>

        { open &&
         <ActiveTabs
            width={() => window.innerWidth * 0.9}
            tabs={[


///////////////////////////////////////////////////////////////////////////////

                // Configurations Tab

            {label: tabTitle("Configurations"), 
                title: unsavedConfigs.size > 0 ? " Contains Unsaved Changes  " : "",
                content:
                <ConfigurationsTab
                    admins={admins}
                    setAdmins={setAdmins}
                    ampGroups={ampGroups}
                    setAmpGroups={setAmpGroups}
                    rateLimit={rateLimit}
                    setRateLimit={setRateLimit}
                    promptCostAlert={promptCostAlert}
                    setPromptCostAlert={setPromptCostAlert}
                    allEmails={allEmails}
                    admin_text={admin_text}
                    updateUnsavedConfigs={updateUnsavedConfigs}
                />
            },


///////////////////////////////////////////////////////////////////////////////
            // Supported Models

            {label: tabTitle('Supported Models'),
                content:
                stillLoadingData ? loading :
                <SupportedModelsTab
                    availableModels={availableModels}
                    setAvailableModels={setAvailableModels}
                    ampGroups={ampGroups}
                    isAvailableCheck={isAvailableCheck}
                    updateUnsavedConfigs={updateUnsavedConfigs}
                />
            },
///////////////////////////////////////////////////////////////////////////////
            // Application Variables
            { label: tabTitle('Application Variables'),
                content : 
                stillLoadingData ? loading :
                <>
                {titleLabel('Application Secrets')}
                    { Object.keys(appSecrets).length > 0 && true ?
                    <div className="mx-4">
                        <InputsMap
                        id = {AdminConfigTypes.APP_SECRETS}
                        inputs={Object.keys(appSecrets).sort((a, b) => b.length - a.length)
                                    .map((secret: string) => {return {label: secret, key: secret}})}
                        state = {appSecrets}
                        inputChanged = {(key:string, value:string) => {
                            setAppSecrets({...appSecrets, [key]: value});
                            updateUnsavedConfigs(AdminConfigTypes.APP_SECRETS);
                        }}
                        obscure={true}
                        />    
                    </div> : <>No Application Secrets Retrieved</>}
                    
                <br className="mt-4"></br>

                {titleLabel('Application Environment Variables')}
                { Object.keys(appSecrets).length > 0 ?
                    <div className="mx-4">
                        <InputsMap
                        id = {AdminConfigTypes.APP_VARS}
                        inputs={Object.keys(appVars)
                                    .sort((a, b) => b.length - a.length)
                                    .map((secret: string) => {return {label: secret, key: secret}})}
                        state = {appVars}
                        inputChanged = {(key:string, value:string) => {
                            setAppVars({...appVars, [key]: value});
                            updateUnsavedConfigs(AdminConfigTypes.APP_VARS);
                        }}
                        obscure={true}
                        />      
                    </div> : <>No Application Variables Retrieved</>}
                </>
            },

///////////////////////////////////////////////////////////////////////////////
            // OpenAi Endpoints
            { label: tabTitle('OpenAi Endpoints'),
                content : 
                stillLoadingData ? loading :
                <OpenAIEndpointsTab
                    openAiEndpoints={openAiEndpoints}
                    setOpenAiEndpoints={setOpenAiEndpoints}
                    updateUnsavedConfigs={updateUnsavedConfigs}
                />

            },

///////////////////////////////////////////////////////////////////////////////
            // Feature Flags

            {label: tabTitle('Feature Flags'),
                content:
                <FeatureFlagsTab
                    features={features}
                    setFeatures={setFeatures}
                    ampGroups={ampGroups}
                    allEmails={allEmails}
                    admin_text={admin_text}
                    updateUnsavedConfigs={updateUnsavedConfigs}
                />
            },
///////////////////////////////////////////////////////////////////////////////

            // Manage Feature Data Tab
                    
            {label: tabTitle("Feature Data"),
             content:
                <FeatureDataTab
                    stillLoadingData={stillLoadingData}
                    admins={admins}
                    ampGroups={ampGroups}
                    astGroups={astGroups}
                    setAstGroups={setAstGroups}
                    amplifyAstGroupId={amplifyAstGroupId}
                    setAmplifyAstGroupId={setAmplifyAstGroupId}
                    changedAstGroups={changedAstGroups}
                    setChangedAstGroups={setChangedAstGroups}
                    templates={templates}
                    setTemplates={setTemplates}
                    changedTemplates={changedTemplates}
                    setChangedTemplates={setChangedTemplates}
                    isAvailableCheck={isAvailableCheck}
                    admin_text={admin_text}
                    updateUnsavedConfigs={updateUnsavedConfigs}
                />
            },
///////////////////////////////////////////////////////////////////////////////
  
            // // Integrations Tab - only included if included in the feature flags list
            // ...(integrations ? 
            //     [
            //     {label: tabTitle("Integrations"),
            //         content:
            //         stillLoadingData ? loading :
            //         <IntegrationsTab
            //             integrations={integrations}
            //             setIntegrations={setIntegrations}
            //             integrationSecrets={integrationSecrets}
            //             setIntegrationSecrets={setIntegrationSecrets}
            //             updateUnsavedConfigs={updateUnsavedConfigs}
            //         />
            //     }
            //     ] : []),

///////////////////////////////////////////////////////////////////////////////

            // Ops

            {label: tabTitle('Ops'),
                content:
                stillLoadingData ? loading :
                <OpsTab
                    ops={ops}
                    setOps={setOps}
                    admin_text={admin_text}
                />
                
            },

            // Embeddings Tab
                    // currently this tab doesnt have changes to report, when it does change to 
                    // tabTitle("Embeddings")
            {label: 'Embeddings',
                content: 
                <EmbeddingsTab
                    refresh={refresh}
                    refreshingTypes={refreshingTypes}
                    setRefreshingTypes={setRefreshingTypes}
                />
            },

        ]
        }
        /> }

      </div>

    }
  />
    
}



interface actionProps {
    label: string;
    onConfirm: () => void;
    onCancel: () => void;
    top?: string;
    clearOnConfirm?: boolean
}

export const UserAction: FC<actionProps> = ({ label, onConfirm, onCancel, top, clearOnConfirm = true}) => {
    
    return ( 
        <div className={`my-2.5 flex flex-row gap-1.5 transparent ${top}`}>
        <button 
                className="text-green-500 hover:text-green-700 cursor-pointer" 
                onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                    if (clearOnConfirm) onCancel(); // clears
                }}
                
                title={label} 
            >
                <IconCheck size={16} />
        </button>
        
        <button
            className="text-red-500 hover:text-red-700 cursor-pointer"
            onClick={(e) => {
            e.stopPropagation();
                onCancel();

            }}
            title={"Cancel"}
        >
            <IconX size={16} />
        </button>
    </div>
    )
}



interface AddEmailsProps {
    key: String;
    emails: string[];
    allEmails: string[]
    handleUpdateEmails: (e: Array<string>) => void;
}

export const AddEmailWithAutoComplete: FC<AddEmailsProps> = ({ key, emails, allEmails, handleUpdateEmails}) => {
    const [input, setInput] = useState<string>('');

    const handleAddEmails = () => {
        const entries = input.split(',').map(email => email.trim()).filter(email => email);

        const newEmails = entries.filter(email => /^\S+@\S+\.\S+$/.test(email) && !emails.includes(email));
        if (newEmails.length > 0) handleUpdateEmails([...emails, ...newEmails]);
        setInput('');
    };

    return ( 
    <div className='flex flex-row gap-2' key={JSON.stringify(key)}>
        <div className='w-full relative'>
            <EmailsAutoComplete
                input = {input}
                setInput =  {setInput}
                allEmails = {allEmails.filter((e:string) => !emails.includes(e))}
                alreadyAddedEmails = {emails}
            /> 
        </div>
        <div className="flex-shrink-0 ml-[-6px]">
            <button
                type="button"
                title='Add User'
                className="ml-2 mt-0.5 px-2 py-2 rounded-md border border-neutral-300 dark:border-white/20 px-2 transition-colors duration-200 cursor-pointer hover:bg-neutral-200 dark:hover:bg-gray-500/10 "
                 
                onClick={handleAddEmails}
            >
                <IconPlus size={18} />
            </button>
        </div>
    
    </div>
    )
}



interface AmplifyGroupSelectProps {
    groups: string[];
    selected: string[];
    setSelected: (s: string[]) => void;
    isDisabled? : boolean;
  }
  
export const AmplifyGroupSelect: React.FC<AmplifyGroupSelectProps> = ({ groups, selected, setSelected, isDisabled = false}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState<string[]>(selected);
    const dropdownRef = useRef<HTMLDivElement>(null);
  
    
      // Close dropdown when clicking outside
      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (
            dropdownRef.current &&
            !dropdownRef.current.contains(event.target as Node)
          ) {
            setIsOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }, []);

      const toggleGroup = (group: string) => {
        const updatedSelectedGroups = selectedGroups.includes(group) 
                    ? selectedGroups.filter(item => item !== group) 
                    : [...selectedGroups, group];
        setSelectedGroups(updatedSelectedGroups);
        setSelected(updatedSelectedGroups);
      };

      const hasGroupOptions = groups.length > 0;
    
      return (
        <div className="relative w-full" ref={dropdownRef}>
          <button
            type="button"
            className="text-center w-full overflow-x-auto px-4 py-2 text-left text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100 flex-grow-0"
            style={{ whiteSpace: 'nowrap', cursor: hasGroupOptions ? "pointer" : 'default' }}
            onClick={() => setIsOpen(!isOpen)}
            disabled={isDisabled}
          >
            {selectedGroups.length > 0 || isDisabled ? selectedGroups.join(', ') 
                 : hasGroupOptions ? 'Select Amplify Groups' : 'No Amplify Groups Available'}
          </button>
    
          {isOpen && !isDisabled && hasGroupOptions && (
            <ul className="absolute z-10 mt-0.5 max-h-60 w-full overflow-auto rounded-lg border-2 border-neutral-500 bg-white shadow-xl dark:border-neutral-900 dark:bg-[#40414F]">
              {groups.sort((a, b) => a.localeCompare(b))
                     .map((g) => (
                <li
                  key={g}
                  className="flex cursor-pointer items-center justify-between px-4 py-2 text-neutral-900 hover:bg-gray-200 dark:hover:bg-gray-500 dark:text-neutral-100 "
                  onClick={() => toggleGroup(g)}
                >
                  <span>{g}</span>
                  {selectedGroups.includes(g) && (
                    <IconCheck className="text-gray-500 dark:text-gray-200" size={18} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
  };





export interface Amplify_Group { // can be a cognito group 
    groupName : string; 
    members : string[];
    createdBy : string;
    includeFromOtherGroups? : string[]; // if is a cognito group, this will always be Absent
}

export interface Amplify_Groups {
    [groupName: string] : Amplify_Group;
}

export interface PromptCostAlert {
    isActive: boolean;
    alertMessage: string;
    cost: Number;
}
