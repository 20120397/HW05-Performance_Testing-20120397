const fs = require('fs');
const path = require('path');

function xmlEsc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAssertion(name, field, testStrings, testType) {
  const stringsXml = testStrings
    .map((s, idx) => `            <stringProp name="str_${idx}">${xmlEsc(s)}</stringProp>`)
    .join('\n');
  return `          <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="${xmlEsc(name)}" enabled="true">
            <collectionProp name="Asserion.test_strings">
${stringsXml}
            </collectionProp>
            <stringProp name="Assertion.custom_message"></stringProp>
            <stringProp name="Assertion.test_field">${field}</stringProp>
            <boolProp name="Assertion.assume_success">false</boolProp>
            <intProp name="Assertion.test_type">${testType}</intProp>
          </ResponseAssertion>
          <hashTree/>`;
}

function buildAuthHeaderManager() {
  return `          <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Auth Header" enabled="true">
            <collectionProp name="HeaderManager.headers">
              <elementProp name="" elementType="Header">
                <stringProp name="Header.name">Authorization</stringProp>
                <stringProp name="Header.value">Bearer \${jwt_token}</stringProp>
              </elementProp>
            </collectionProp>
          </HeaderManager>
          <hashTree/>`;
}

function buildJsonExtractor(name, refName, jsonPath, defaultVal) {
  return `          <JSONPostProcessor guiclass="JSONPostProcessorGui" testclass="JSONPostProcessor" testname="${xmlEsc(name)}" enabled="true">
            <stringProp name="JSONPostProcessor.referenceNames">${xmlEsc(refName)}</stringProp>
            <stringProp name="JSONPostProcessor.jsonPathExprs">${xmlEsc(jsonPath)}</stringProp>
            <stringProp name="JSONPostProcessor.match_numbers">1</stringProp>
            <stringProp name="JSONPostProcessor.defaultValues">${xmlEsc(defaultVal)}</stringProp>
          </JSONPostProcessor>
          <hashTree/>`;
}

function buildSampler({ name, method, apiPath, body, children = [] }) {
  const hasBody = body !== undefined && body !== null;
  const argsXml = hasBody
    ? `          <boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              <elementProp name="" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">${xmlEsc(body)}</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>`
    : `          <boolProp name="HTTPSampler.postBodyRaw">false</boolProp>
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
            <collectionProp name="Arguments.arguments"/>
          </elementProp>`;

  const childrenBlock = children.length
    ? `        <hashTree>\n${children.join('\n')}\n        </hashTree>`
    : `        <hashTree/>`;

  return `        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${xmlEsc(name)}" enabled="true">
          <stringProp name="HTTPSampler.path">${xmlEsc(apiPath)}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <stringProp name="HTTPSampler.method">${method}</stringProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
${argsXml}
        </HTTPSamplerProxy>
${childrenBlock}`;
}

function buildListener(guiclass, testname) {
  return `        <ResultCollector guiclass="${guiclass}" testclass="ResultCollector" testname="${xmlEsc(testname)}" enabled="true">
          <boolProp name="ResultCollector.error_logging">false</boolProp>
          <objProp>
            <name>saveConfig</name>
            <value class="SampleSaveConfiguration">
              <time>true</time>
              <latency>true</latency>
              <timestamp>true</timestamp>
              <success>true</success>
              <label>true</label>
              <code>true</code>
              <message>true</message>
              <threadName>true</threadName>
              <dataType>true</dataType>
              <encoding>false</encoding>
              <assertions>true</assertions>
              <subresults>true</subresults>
              <responseData>false</responseData>
              <samplerData>false</samplerData>
              <xml>false</xml>
              <fieldNames>true</fieldNames>
              <responseHeaders>false</responseHeaders>
              <requestHeaders>false</requestHeaders>
              <responseDataOnError>false</responseDataOnError>
              <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
              <assertionsResultsToSave>0</assertionsResultsToSave>
              <bytes>true</bytes>
              <sentBytes>true</sentBytes>
              <url>true</url>
              <threadCounts>true</threadCounts>
              <idleTime>true</idleTime>
              <connectTime>true</connectTime>
            </value>
          </objProp>
          <stringProp name="filename"></stringProp>
        </ResultCollector>
        <hashTree/>`;
}

function buildJmx(cfg) {
  const s1 = buildSampler({
    name: '01_POST_Admin_Login',
    method: 'POST',
    apiPath: '/api/login',
    body: '{"email":"${email}","password":"${password}"}',
    children: [
      buildJsonExtractor('Extract jwt_token', 'jwt_token', '$.token', 'NO_TOKEN'),
      buildAssertion('Assert Login 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Token Returned', 'Assertion.response_data', ['"token"'], 16),
    ],
  });

  const s2 = buildSampler({
    name: '02_GET_Admin_Orders',
    method: 'GET',
    apiPath: '/api/admin/orders',
    children: [
      buildAuthHeaderManager(),
      buildAssertion('Assert Orders 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Orders JSON Array', 'Assertion.response_data', ['['], 16),
    ],
  });

  const s3 = buildSampler({
    name: '03_GET_Admin_Users',
    method: 'GET',
    apiPath: '/api/admin/users',
    children: [
      buildAuthHeaderManager(),
      buildAssertion('Assert Users 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Users Email Field', 'Assertion.response_data', ['"email"'], 16),
    ],
  });

  const s4 = buildSampler({
    name: '04_GET_Categories',
    method: 'GET',
    apiPath: '/api/categories',
    children: [
      buildAssertion('Assert Categories 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Categories Name Field', 'Assertion.response_data', ['"name"'], 16),
    ],
  });

  const s5 = buildSampler({
    name: '05_POST_Create_Product',
    method: 'POST',
    apiPath: '/api/products',
    body: '{"name":"${name}","price":${price},"description":"${description}","imageUrl":"${imageUrl}","category_id":${category_id}}',
    children: [
      buildAuthHeaderManager(),
      buildJsonExtractor('Extract created_product_id', 'created_product_id', '$.id', '0'),
      buildAssertion('Assert Create 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Product Created', 'Assertion.response_data', ['Product created'], 16),
    ],
  });

  const s6 = buildSampler({
    name: '06_PUT_Update_Product',
    method: 'PUT',
    apiPath: '/api/products/${created_product_id}',
    body: '{"name":"${updated_name}","price":${updated_price},"description":"${description} [Updated]","imageUrl":"${imageUrl}","category_id":${category_id}}',
    children: [
      buildAuthHeaderManager(),
      buildAssertion('Assert Update 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Product Updated', 'Assertion.response_data', ['Product updated'], 16),
    ],
  });

  const s7 = buildSampler({
    name: '07_DELETE_Delete_Product',
    method: 'DELETE',
    apiPath: '/api/products/${created_product_id}',
    children: [
      buildAuthHeaderManager(),
      buildAssertion('Assert Delete 200', 'Assertion.response_code', ['200'], 8),
      buildAssertion('Assert Product Deleted', 'Assertion.response_data', ['Product deleted'], 16),
    ],
  });

  const listener = buildListener(cfg.listenerClass, cfg.listenerName);

  return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="${xmlEsc(cfg.planName)}" enabled="true">
      <stringProp name="TestPlan.comments">${xmlEsc(cfg.comment)}</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_HOST" elementType="Argument">
            <stringProp name="Argument.name">BASE_HOST</stringProp>
            <stringProp name="Argument.value">localhost</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
          <elementProp name="BASE_PORT" elementType="Argument">
            <stringProp name="Argument.name">BASE_PORT</stringProp>
            <stringProp name="Argument.value">3000</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
          <elementProp name="DATA_DIR" elementType="Argument">
            <stringProp name="Argument.name">DATA_DIR</stringProp>
            <stringProp name="Argument.value">\${__P(dataDir,../data)}</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement" testname="HTTP Request Defaults" enabled="true">
        <stringProp name="HTTPSampler.domain">\${BASE_HOST}</stringProp>
        <stringProp name="HTTPSampler.port">\${BASE_PORT}</stringProp>
        <stringProp name="HTTPSampler.protocol">http</stringProp>
        <stringProp name="HTTPSampler.contentEncoding">UTF-8</stringProp>
        <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
          <collectionProp name="Arguments.arguments"/>
        </elementProp>
        <stringProp name="HTTPSampler.implementation">HttpClient4</stringProp>
      </ConfigTestElement>
      <hashTree/>
      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Global JSON Content-Type" enabled="true">
        <collectionProp name="HeaderManager.headers">
          <elementProp name="" elementType="Header">
            <stringProp name="Header.name">Content-Type</stringProp>
            <stringProp name="Header.value">application/json</stringProp>
          </elementProp>
        </collectionProp>
      </HeaderManager>
      <hashTree/>
      <CSVDataSet guiclass="TestBeanGUI" testclass="CSVDataSet" testname="CSV Admin Credentials" enabled="true">
        <stringProp name="delimiter">,</stringProp>
        <stringProp name="fileEncoding">UTF-8</stringProp>
        <stringProp name="filename">\${DATA_DIR}/admin_credentials.csv</stringProp>
        <boolProp name="ignoreFirstLine">true</boolProp>
        <boolProp name="quotedData">false</boolProp>
        <boolProp name="recycle">true</boolProp>
        <stringProp name="shareMode">shareMode.all</stringProp>
        <boolProp name="stopThread">false</boolProp>
        <stringProp name="variableNames">email,password</stringProp>
      </CSVDataSet>
      <hashTree/>
      <CSVDataSet guiclass="TestBeanGUI" testclass="CSVDataSet" testname="CSV Product Payloads" enabled="true">
        <stringProp name="delimiter">,</stringProp>
        <stringProp name="fileEncoding">UTF-8</stringProp>
        <stringProp name="filename">\${DATA_DIR}/products_payload.csv</stringProp>
        <boolProp name="ignoreFirstLine">true</boolProp>
        <boolProp name="quotedData">false</boolProp>
        <boolProp name="recycle">true</boolProp>
        <stringProp name="shareMode">shareMode.all</stringProp>
        <boolProp name="stopThread">false</boolProp>
        <stringProp name="variableNames">name,price,description,imageUrl,category_id,updated_name,updated_price</stringProp>
      </CSVDataSet>
      <hashTree/>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="${xmlEsc(cfg.threadGroupName)}" enabled="true">
        <intProp name="ThreadGroup.num_threads">${cfg.threads}</intProp>
        <intProp name="ThreadGroup.ramp_time">${cfg.rampUp}</intProp>
        <longProp name="ThreadGroup.duration">${cfg.duration}</longProp>
        <longProp name="ThreadGroup.delay">0</longProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
          <intProp name="LoopController.loops">-1</intProp>
          <boolProp name="LoopController.continue_forever">false</boolProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <GaussianRandomTimer guiclass="GaussianRandomTimerGui" testclass="GaussianRandomTimer" testname="Think Time (Gaussian)" enabled="true">
          <stringProp name="ConstantTimer.delay">${cfg.thinkDelayMs}</stringProp>
          <stringProp name="RandomTimer.range">${cfg.thinkRangeMs}</stringProp>
        </GaussianRandomTimer>
        <hashTree/>
${s1}
${s2}
${s3}
${s4}
${s5}
${s6}
${s7}
${listener}
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
`;
}

const scenarios = [
  {
    file: '20120397_Load_20261122.jmx',
    planName: '20120397_Load_20261122',
    threadGroupName: 'Load Test - Admin Dashboard & Product CRUD (20 VU / 120s)',
    comment: 'Load Testing: 20 virtual users, 20s ramp-up, 120s duration, Summary Report listener.',
    threads: 20,
    rampUp: 20,
    duration: 120,
    thinkDelayMs: 500,
    thinkRangeMs: 200,
    listenerClass: 'SummaryReport',
    listenerName: 'Summary Report',
  },
  {
    file: '20120397_Stress_20261122.jmx',
    planName: '20120397_Stress_20261122',
    threadGroupName: 'Stress Test - Admin Dashboard & Product CRUD (100 VU / 120s)',
    comment: 'Stress Testing: 100 virtual users, 60s ramp-up, 120s duration, Aggregate Report listener.',
    threads: 100,
    rampUp: 60,
    duration: 120,
    thinkDelayMs: 200,
    thinkRangeMs: 100,
    listenerClass: 'StatVisualizer',
    listenerName: 'Aggregate Report',
  },
  {
    file: '20120397_Spike_20261122.jmx',
    planName: '20120397_Spike_20261122',
    threadGroupName: 'Spike Test - Admin Dashboard & Product CRUD (150 VU / 5s burst)',
    comment: 'Spike Testing: 150 virtual users in 5s ramp-up, 60s duration, View Results Tree listener.',
    threads: 150,
    rampUp: 5,
    duration: 60,
    thinkDelayMs: 100,
    thinkRangeMs: 50,
    listenerClass: 'ViewResultsFullVisualizer',
    listenerName: 'View Results Tree',
  },
  {
    file: '20120397_Endurance_20261122.jmx',
    planName: '20120397_Endurance_20261122',
    threadGroupName: 'Endurance Soak Test - Admin Dashboard & Product CRUD (15 VU / 600s)',
    comment: 'Endurance/Soak Testing: 15 virtual users sustained for 600s (10 minutes), Response Time Graph listener.',
    threads: 15,
    rampUp: 15,
    duration: 600,
    thinkDelayMs: 500,
    thinkRangeMs: 200,
    listenerClass: 'RespTimeGraphVisualizer',
    listenerName: 'Response Time Graph',
  },
];

const outDir = 'D:\\KTPM\\HW05\\20120397\\test-plans';
for (const s of scenarios) {
  const outPath = path.join(outDir, s.file);
  fs.writeFileSync(outPath, buildJmx(s), 'utf8');
  console.log('Generated:', outPath);
}
